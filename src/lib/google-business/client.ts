import { z } from "zod";
import {metricNames,performanceSchema,type ProfileFields} from './profile-data';

const accountSchema = z.object({ name: z.string(), accountName: z.string().optional(), type: z.string().optional() });
const locationSchema = z.object({ name: z.string(), title: z.string().optional(), storefrontAddress:z.object({addressLines:z.array(z.string()).optional(),locality:z.string().optional(),administrativeArea:z.string().optional(),postalCode:z.string().optional()}).optional() });
const replySchema = z.object({ comment: z.string().optional(), updateTime: z.string().optional() });
const reviewSchema = z.object({
  reviewId: z.string(), name: z.string().optional(),
  reviewer: z.object({ displayName: z.string().optional(), isAnonymous: z.boolean().optional() }).optional(),
  starRating: z.enum(["STAR_RATING_UNSPECIFIED", "ONE", "TWO", "THREE", "FOUR", "FIVE"]),
  comment: z.string().optional(), createTime: z.string().optional(), updateTime: z.string().optional(),
  reviewReply: replySchema.optional(),
});
export type GoogleReview = z.infer<typeof reviewSchema>;
export type GoogleBusinessErrorCode = "reconnect" | "access_denied" | "quota" | "unavailable" | "invalid_response";
export class GoogleBusinessError extends Error {
  constructor(public readonly code: GoogleBusinessErrorCode, public readonly status: number) {
    super({ reconnect: "Reconnect your Google account.", access_denied: "Google denied access. Check API approval, enabled APIs, and business permissions.", quota: "Google request quota is unavailable or exhausted. Check the project quota before retrying.", unavailable: "Google Business Profile is temporarily unavailable.", invalid_response: "Google returned an unexpected response." }[code]);
    this.name = "GoogleBusinessError";
  }
}

function resource(value: string, pattern: RegExp): string {
  if (!pattern.test(value)) throw new Error("Invalid Google Business Profile resource name.");
  return value;
}

function displayHours(periods:unknown[],special=false):string {
 const time=(v:unknown)=>{const t=v as {hours?:number;minutes?:number}|undefined;return `${String(t?.hours||0).padStart(2,'0')}:${String(t?.minutes||0).padStart(2,'0')}`;};
 const date=(v:unknown)=>{const d=v as {year:number;month:number;day:number}|undefined;return d?`${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`:'';};
 return periods.map(value=>{const p=value as Record<string,unknown>;return special?`${date(p.startDate)}${p.endDate&&date(p.endDate)!==date(p.startDate)?' – '+date(p.endDate):''}: ${p.closed?'Closed':time(p.openTime)+' – '+time(p.closeTime)}`:`${String(p.openDay||'')}: ${time(p.openTime)} – ${time(p.closeTime)}${p.closeDay!==p.openDay?' ('+String(p.closeDay)+')':''}`;}).join('\n');
}

/** Server-side transport only. The caller must authorize the account/location for its tenant.
 * No automatic write retries: a timed-out reply may already have been published by Google. */
export function createGoogleBusinessClient(accessToken: string, fetcher: typeof fetch = fetch) {
  if (!accessToken.trim()) throw new Error("A Google access token is required.");
  async function request<S extends z.ZodTypeAny>(url: URL, schema: S, body?: { comment: string }): Promise<z.output<S>> {
    let response: Response;
    try {
      response = await fetcher(url, {
        method: body ? "PUT" : "GET", cache: "no-store", redirect: "manual",
        signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new GoogleBusinessError("unavailable", 0); }
    if (!response.ok) {
      const code = response.status === 401 ? "reconnect" : response.status === 403 ? "access_denied" : response.status === 429 ? "quota" : "unavailable";
      // Never surface Google's raw body: it can contain account or credential details.
      throw new GoogleBusinessError(code, response.status);
    }
    try { return schema.parse(await response.json()); }
    catch { throw new GoogleBusinessError("invalid_response", response.status); }
  }
  return {
    async getProfile(location:string):Promise<ProfileFields> {
      const url=new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${resource(location,/^locations\/[A-Za-z0-9_-]+$/)}`);
      url.searchParams.set('readMask','name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours,specialHours');
      const data=await request(url,z.object({name:z.string(),title:z.string(),storefrontAddress:z.object({addressLines:z.array(z.string()).optional(),locality:z.string().optional(),administrativeArea:z.string().optional(),postalCode:z.string().optional(),regionCode:z.string().optional()}).optional(),phoneNumbers:z.object({primaryPhone:z.string().optional()}).optional(),websiteUri:z.string().optional(),categories:z.object({primaryCategory:z.object({displayName:z.string()}).optional(),additionalCategories:z.array(z.object({displayName:z.string()})).optional()}).optional(),profile:z.object({description:z.string().optional()}).optional(),regularHours:z.object({periods:z.array(z.unknown()).optional()}).optional(),specialHours:z.object({specialHourPeriods:z.array(z.unknown()).optional()}).optional()}));
      if(data.name!==location)throw new GoogleBusinessError('invalid_response',200);
      const a=data.storefrontAddress;
      return {name:data.title,address:[...(a?.addressLines||[]),a?.locality,a?.administrativeArea,a?.postalCode,a?.regionCode].filter(Boolean).join(', '),phone:data.phoneNumbers?.primaryPhone||'',website:data.websiteUri||'',categories:[data.categories?.primaryCategory?.displayName,...(data.categories?.additionalCategories||[]).map(c=>c.displayName)].filter(Boolean).join('\n'),description:data.profile?.description||'',hours:displayHours(data.regularHours?.periods||[]),specialHours:displayHours(data.specialHours?.specialHourPeriods||[],true)};
    },
    getPerformance(location:string,start:string,end:string) {
      const url=new URL(`https://businessprofileperformance.googleapis.com/v1/${resource(location,/^locations\/[A-Za-z0-9_-]+$/)}:fetchMultiDailyMetricsTimeSeries`);
      for(const metric of metricNames)url.searchParams.append('dailyMetrics',metric);
      for(const [key,value] of [['start_date',start],['end_date',end]]){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Invalid reporting date');const parts=value.split('-');['year','month','day'].forEach((part,i)=>url.searchParams.set(`dailyRange.${key}.${part}`,String(Number(parts[i]))));}
      return request(url,performanceSchema);
    },
    listAccounts(pageToken?: string, parentAccount?: string) {
      const url = new URL("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
      if (parentAccount) url.searchParams.set("parentAccount", resource(parentAccount, /^accounts\/[A-Za-z0-9_-]+$/));
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      return request(url, z.object({ accounts: z.array(accountSchema).default([]), nextPageToken: z.string().optional() }));
    },
    listLocations(account: string, pageToken?: string) {
      const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${resource(account, /^accounts\/[A-Za-z0-9_-]+$/)}/locations`);
      url.searchParams.set("readMask", "name,title,storefrontAddress");
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      return request(url, z.object({ locations: z.array(locationSchema).default([]), nextPageToken: z.string().optional() }));
    },
    listReviews(parent: string, pageToken?: string) {
      const url = new URL(`https://mybusiness.googleapis.com/v4/${resource(parent, /^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+$/)}/reviews`);
      url.searchParams.set("pageSize", "50");
      url.searchParams.set("orderBy", "updateTime desc");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      return request(url, z.object({ reviews: z.array(reviewSchema).default([]), averageRating: z.number().optional(), totalReviewCount: z.number().optional(), nextPageToken: z.string().optional() }));
    },
    getReview(reviewName: string) {
      const name = resource(reviewName, /^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+\/reviews\/[A-Za-z0-9_-]+$/);
      return request(new URL(`https://mybusiness.googleapis.com/v4/${name}`), reviewSchema);
    },
    publishReply(reviewName: string, comment: string) {
      const trimmed = comment.trim();
      if (!trimmed || trimmed.length > 4096) throw new Error("Reply must contain 1–4096 characters.");
      const name = resource(reviewName, /^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+\/reviews\/[A-Za-z0-9_-]+$/);
      return request(new URL(`https://mybusiness.googleapis.com/v4/${name}/reply`), replySchema, { comment: trimmed });
    },
  };
}

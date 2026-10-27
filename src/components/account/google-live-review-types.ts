import type { GoogleReview } from '@/lib/google-business/client';
import type { ReplyStyle } from '@/lib/review-ai-options';
export type Row={scheduled_at?:string|null;suspected_spam?:boolean;id:string;data:GoogleReview;draft:string;version:number;approved_version?:number|null;publish_state:string};
export type Workspace={initial_import_completed?:boolean;sync_in_progress?:boolean;saved_count?:number;draft_low_stars?:boolean;reply_delay_minutes?:number;review_total?:number|null;imported_count?:number;ai_monthly_limit?:number;ai_monthly_used?:number;owner:string;business_id:string;business_name:string;title:string;enabled:boolean;connected:boolean;synced_at:string|null;next_page:string|null;last_error:string|null;ai_consent:boolean;auto_enabled:boolean;auto_four:boolean;auto_five:boolean;auto_style:ReplyStyle;settings_version:number;draft_error?:string|null;draft_checked_at?:string|null;moreReviews:boolean;reviews:Row[]};
export type Snapshot={workspaces:Workspace[];publishingEnabled:boolean;businesses?:{id:string;business_name:string;email:string}[]};
export type Post=(body:unknown)=>Promise<Record<string,unknown>>;

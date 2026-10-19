import { NextResponse } from "next/server";
import { googleAdminIdentity } from "@/lib/google-business/http";
import { createAdminCustomer, createCustomerSchema } from "@/lib/admin-customer-create";
export async function POST(request: Request) {
 if (!(await googleAdminIdentity())) return NextResponse.json({error:"Admin sign-in required."},{status:401});
 if (request.headers.get("origin") !== new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com").origin)
  return NextResponse.json({error:"Invalid request origin."},{status:403});
 const raw=await request.text();
 if(raw.length>4096) return NextResponse.json({error:"Customer details are too long."},{status:413});
 let input:unknown;
 try { input=JSON.parse(raw); } catch { return NextResponse.json({error:"Invalid customer details."},{status:400}); }
 const parsed=createCustomerSchema.safeParse(input);
 if(!parsed.success) return NextResponse.json({error:"Enter a name and valid email address. Phone is optional."},{status:400});
 try {
  const result=await createAdminCustomer(parsed.data);
  if(!result.ok) return NextResponse.json({error:result.error},{status:result.status});
  return NextResponse.json(result,{status:201,headers:{"Cache-Control":"no-store"}});
 } catch { return NextResponse.json({error:"Customer storage is unavailable. Please try again."},{status:503}); }
}

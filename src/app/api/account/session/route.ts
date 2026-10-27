import {withServerTiming,measureServerStage} from "@/lib/server-timing";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerCookieName, isActiveCustomerSession, parseCustomerSession } from "@/lib/customer-auth";
import {getCustomerExperience} from '@/lib/customer-experience';

async function sessionResponse() {
  const cookieStore = await cookies();
  const session = parseCustomerSession(cookieStore.get(customerCookieName)?.value);

  if (!session || !(await measureServerStage("authentication",()=>isActiveCustomerSession(session.email, session.issuedAt)))) {
    return NextResponse.json({ authenticated: false });
  }

  const {portal,service,stands,multilink}=await measureServerStage("experience",()=>getCustomerExperience(session.email));

  return NextResponse.json({
    authenticated: true,
    service,stands,multilink,
    email: session.email,
    name: portal.customer?.name,
    businessName: portal.businesses[0]?.businessName
  });
}

export const GET=(request:Request)=>withServerTiming(request,sessionResponse);

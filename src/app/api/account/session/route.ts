import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerCookieName, isActiveCustomerSession, parseCustomerSession } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";

export async function GET() {
  const cookieStore = await cookies();
  const session = parseCustomerSession(cookieStore.get(customerCookieName)?.value);

  if (!session || !(await isActiveCustomerSession(session.email, session.issuedAt))) {
    return NextResponse.json({ authenticated: false });
  }

  const portal = await getCustomerPortal(session.email);

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    name: portal.customer?.name,
    businessName: portal.businesses[0]?.businessName
  });
}

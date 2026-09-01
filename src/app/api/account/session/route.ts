import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerCookieName, parseCustomerSession } from "@/lib/customer-auth";

export async function GET() {
  const cookieStore = await cookies();
  const session = parseCustomerSession(cookieStore.get(customerCookieName)?.value);

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true, email: session.email });
}

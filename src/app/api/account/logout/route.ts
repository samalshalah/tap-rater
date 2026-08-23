import { NextResponse } from "next/server";
import { customerCookieName } from "@/lib/customer-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/account/login", request.url));
  response.cookies.set(customerCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}

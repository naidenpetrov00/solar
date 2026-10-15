import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  const response = await handlers.POST(request);
  const pathname = new URL(request.url).pathname;

  if (
    pathname.endsWith("/api/auth/request-password-reset") &&
    response.status >= 500
  ) {
    return NextResponse.json({
      status: true,
      message: "If this email exists in our system, check your email for the reset link",
    });
  }

  return response;
}

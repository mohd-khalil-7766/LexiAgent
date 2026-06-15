import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log("🔥 TELEGRAM HIT:", body);

  return NextResponse.json({
    ok: true,
    debug: body,
    message: "Webhook is working NOW",
  });
}
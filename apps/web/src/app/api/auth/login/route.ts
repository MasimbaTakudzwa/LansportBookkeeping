import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    // Auth not configured — login always succeeds (app is open)
    return NextResponse.json({ ok: true });
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("lansport_auth", expected, {
    httpOnly: true,
    sameSite: "lax",
    // Not secure: we're on localhost HTTP. In production with HTTPS, set secure: true.
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}

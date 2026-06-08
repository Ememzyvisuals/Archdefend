import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  if (error) {
    return NextResponse.redirect(`${APP_URL}/?auth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${APP_URL}/?auth_error=missing_code`);
  }

  try {
    const qs = new URLSearchParams({ code });
    if (state) qs.set("state", state);

    const res = await fetch(
      `${API_URL}/api/v1/auth/github/callback?${qs.toString()}`,
      { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Auth failed" }));
      return NextResponse.redirect(
        `${APP_URL}/?auth_error=${encodeURIComponent(err.detail || "Authentication failed")}`
      );
    }

    const data = await res.json();
    const { access_token, refresh_token, user } = data;

    const params = new URLSearchParams({
      token: access_token,
      refresh: refresh_token,
      user: encodeURIComponent(JSON.stringify(user)),
    });

    const response = NextResponse.redirect(`${APP_URL}/auth/complete?${params.toString()}`);

    response.cookies.set("archdefend_token", access_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    response.cookies.set("archdefend_refresh", refresh_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.redirect(`${APP_URL}/?auth_error=server_error`);
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  return NextResponse.json({ success: true });
}

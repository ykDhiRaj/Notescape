import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { apiKey } = await req.json();
  if (!apiKey || typeof apiKey !== "string")
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });

  // Never log the key
  const api_key_encrypted = encrypt(apiKey);
  console.log(api_key_encrypted);

  const { error } = await supabaseAdmin
    .from("user_api_keys")
    .upsert({ user_id: userId, api_key_encrypted, enc_version: 1 });

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  return NextResponse.json({ success: true });
}

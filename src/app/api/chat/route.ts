// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";

function fixLatex(text: string) {
  return text
    .replace(/\\hat\$\$\s\\beta/g, '\\hat{\\beta}')
    .replace(/\$\$(.?)\$\$/g, '$$$1$$')
    .replace(/(?<!\$)\\hat\{?\\beta\}?/g, '$\\hat{\\beta}$');
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { messages } = await req.json();
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // 1) Try to use user-provided (encrypted) key
  const { data: keyRow } = await supabaseAdmin
    .from("user_api_keys")
    .select("api_key_encrypted")
    .eq("user_id", userId)
    .maybeSingle();

  let apiKey: string | undefined;
  if (keyRow?.api_key_encrypted) {
    try {
      apiKey = decrypt(keyRow.api_key_encrypted);
    } catch {
      // If decryption fails, treat as no key
      apiKey = undefined;
    }
  }

  // 2) If no BYO key, enforce soft quota on shared key
  if (!apiKey) {
    // a) Fetch quota row
    const { data: quota } = await supabaseAdmin
      .from("user_quota")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date();

    // b) Reset or create row if needed
    if (!quota) {
      await supabaseAdmin.from("user_quota").insert({
        user_id: userId,
        used_requests: 0,
        daily_limit: 7,
        reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
    } else if (new Date(quota.reset_at) <= now) {
      await supabaseAdmin
        .from("user_quota")
        .update({
          used_requests: 0,
          reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("user_id", userId);
    }

    // c) Atomic increment if under limit
    const { data: updated, error: incErr } = await supabaseAdmin
      .from("user_quota")
      .update({ used_requests: (quota?.used_requests ?? 0) + 1 })
      .eq("user_id", userId)
      .lte("used_requests", (quota?.daily_limit ?? 7) - 1) // allow only if < limit
      .select("used_requests, daily_limit")
      .single();

    if (incErr || !updated) {
      return NextResponse.json(
        {
          error:
            "Daily quota exceeded. You can wait for reset or add your OpenRouter API key in Settings to continue.",
        },
        { status: 429 }
      );
    }

    apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing OPENROUTER_API_KEY" }, { status: 500 });
    }
  }

  // 3) Call OpenRouter
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b:free",
      messages,
    }),
  });

  // Handle rate limit or upstream errors
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const status = res.status;
    return NextResponse.json(
      { error: `Upstream error (${status}). ${text?.slice(0, 400)}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  let reply = data?.choices?.[0]?.message?.content || "Limit exceed please comeback later";
  reply = fixLatex(reply);

  return NextResponse.json({ reply });
}

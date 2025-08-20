import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Track ongoing save operations to prevent concurrent saves
const ongoingSaves = new Set<string>();

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const documentId = body.document_id;
  const pages = body.pages; // [{ page_index: 0, data: {...} }, ...]

  if (!documentId || !Array.isArray(pages)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Prevent concurrent saves for the same document
  if (ongoingSaves.has(documentId)) {
    console.log(`Save already in progress for document ${documentId}, skipping`);
    return NextResponse.json({ error: "Save already in progress" }, { status: 409 });
  }

  ongoingSaves.add(documentId);

  try {
    console.log(`Saving ${pages.length} pages for document ${documentId}`);
    pages.forEach((p, i) => {
      console.log(`Page ${i}: index=${p.page_index}, objects=${p.data?.objects?.length || 0}`);
    });

    // Use upsert instead of delete + insert to avoid constraint issues
    const rows = pages.map((p: unknown) => ({
      document_id: documentId,
      page_index: (p as { page_index: number; data: unknown }).page_index,
      data: (p as { page_index: number; data: unknown }).data,
    }));

    // First, delete all existing pages for this document
    console.log(`Deleting all existing pages for document ${documentId}`);
    const { error: deleteError } = await supabaseAdmin
      .from("pages")
      .delete()
      .eq("document_id", documentId);

    if (deleteError) {
      throw new Error(`Failed to delete existing pages: ${deleteError.message}`);
    }
    console.log(`Successfully deleted existing pages`);

    // Add a small delay to ensure delete operation is fully committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Then insert the new pages
    const { error: insertError } = await supabaseAdmin
      .from("pages")
      .insert(rows);

    if (insertError) {
      throw new Error(`Failed to insert pages: ${insertError.message}`);
    }

    // update document's updated_at
    await supabaseAdmin.from("documents").update({ updated_at: new Date().toISOString() }).eq("id", documentId);

    console.log(`Successfully saved ${pages.length} pages for document ${documentId}`);
    return NextResponse.json({ ok: true });

  } catch (error: unknown) {
    console.error(`Error saving pages for document ${documentId}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  } finally {
    // Always remove from ongoing saves
    ongoingSaves.delete(documentId);
  }
}

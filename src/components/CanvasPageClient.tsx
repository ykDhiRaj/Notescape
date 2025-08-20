"use client";
import CanvasNotebook from "@/components/CanvasNotebook";

export default function CanvasPageClient({ documentId }: { documentId: string }) {
  // CanvasNotebook will handle load/save for this document id
  return <CanvasNotebook documentId={documentId} isdemo={false} />;
}

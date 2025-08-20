import CanvasPageClient from "@/components/CanvasPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <CanvasPageClient documentId={id} />;
}

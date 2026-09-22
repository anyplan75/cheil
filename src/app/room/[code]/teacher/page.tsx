import { TeacherRoom } from "@/components/TeacherRoom";
import { ensureRoom } from "@/lib/rooms";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ code: string }> };

export default async function TeacherPage({ params }: Props) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalized)) notFound();
  ensureRoom(normalized);
  return <TeacherRoom code={normalized} />;
}

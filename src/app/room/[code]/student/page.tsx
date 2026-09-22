import { StudentRoom } from "@/components/StudentRoom";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ code: string }> };

export default async function StudentPage({ params }: Props) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalized)) notFound();
  return <StudentRoom code={normalized} />;
}

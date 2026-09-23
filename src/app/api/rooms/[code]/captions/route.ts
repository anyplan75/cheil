import { NextResponse } from "next/server";
import {
  appendFinalCaption,
  clearCaptions,
  getRoom,
  publicRoomView,
  touchTeacher,
  updateLiveCaption,
} from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;

  const body = (await request.json()) as {
    type?: "live" | "final" | "clear" | "teacher";
    text?: string;
    connected?: boolean;
  };

  switch (body.type) {
    case "live":
      await updateLiveCaption(code, body.text ?? "");
      break;
    case "final":
      await appendFinalCaption(code, body.text ?? "");
      break;
    case "clear":
      await clearCaptions(code);
      break;
    case "teacher":
      await touchTeacher(code, Boolean(body.connected));
      break;
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const updated = await getRoom(code);
  if (!updated) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json(publicRoomView(updated));
}

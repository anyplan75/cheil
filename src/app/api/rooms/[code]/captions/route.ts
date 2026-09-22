import { NextResponse } from "next/server";
import {
  appendFinalCaption,
  clearCaptions,
  ensureRoom,
  getRoom,
  publicRoomView,
  touchTeacher,
  updateLiveCaption,
} from "@/lib/rooms";

export const runtime = "nodejs";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  ensureRoom(code);

  const body = (await request.json()) as {
    type?: "live" | "final" | "clear" | "teacher";
    text?: string;
    connected?: boolean;
  };

  switch (body.type) {
    case "live":
      updateLiveCaption(code, body.text ?? "");
      break;
    case "final":
      appendFinalCaption(code, body.text ?? "");
      break;
    case "clear":
      clearCaptions(code);
      break;
    case "teacher":
      touchTeacher(code, Boolean(body.connected));
      break;
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const updated = getRoom(code)!;
  return NextResponse.json(publicRoomView(updated));
}

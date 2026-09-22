import { NextResponse } from "next/server";
import { getRoom, publicRoomView } from "@/lib/rooms";

export const runtime = "nodejs";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json(publicRoomView(room));
}

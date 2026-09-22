import { NextResponse } from "next/server";
import { createRoom, publicRoomView } from "@/lib/rooms";

export const runtime = "nodejs";

export async function POST() {
  const room = createRoom();
  return NextResponse.json(publicRoomView(room));
}

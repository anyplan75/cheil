import { NextResponse } from "next/server";
import { createRoom, publicRoomView } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const room = await createRoom();
  return NextResponse.json(publicRoomView(room));
}

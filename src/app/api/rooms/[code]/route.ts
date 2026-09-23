import { NextResponse } from "next/server";
import { ensureRoom, publicRoomView } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  const room = await ensureRoom(code);
  return NextResponse.json(publicRoomView(room));
}

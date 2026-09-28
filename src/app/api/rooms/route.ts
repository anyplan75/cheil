import { NextResponse } from "next/server";
import { createRoom, publicRoomView } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let churchName = "";
  try {
    const body = (await request.json()) as { churchName?: string };
    churchName = body.churchName ?? "";
  } catch {
    /* empty body is fine */
  }

  const room = await createRoom({ churchName });
  return NextResponse.json(publicRoomView(room));
}

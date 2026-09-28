import { ensureRoom, publicRoomView, subscribe } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ code: string }> };

export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  const room = await ensureRoom(code);

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send(publicRoomView(room));

      const unsubscribe = subscribe(code, (next) => {
        try {
          send(publicRoomView(next));
        } catch {
          unsubscribe();
        }
      });

      // On serverless, also poll remote store so cross-instance updates arrive.
      const poll = setInterval(() => {
        void ensureRoom(code).then((latest) => {
          try {
            send(publicRoomView(latest));
          } catch {
            clearInterval(poll);
          }
        });
      }, 1200);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      cleanup = () => {
        clearInterval(heartbeat);
        clearInterval(poll);
        unsubscribe();
      };

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

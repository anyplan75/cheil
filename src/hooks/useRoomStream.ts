"use client";

import { useEffect, useState } from "react";

export type RoomView = {
  code: string;
  teacherConnected: boolean;
  liveText: string;
  captions: { id: string; text: string; final: boolean; at: number }[];
  updatedAt: number;
};

export function useRoomStream(code: string) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      setStatus("connecting");
      source = new EventSource(`/api/rooms/${code}/stream`);

      source.onmessage = (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data) as RoomView;
          setRoom(data);
          setStatus("live");
          setError(null);
        } catch {
          /* ignore parse errors */
        }
      };

      source.onerror = () => {
        source?.close();
        if (cancelled) return;
        setStatus("error");
        setError("연결이 끊겼습니다. 다시 연결 중…");
        retryTimer = setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [code]);

  return { room, status, error };
}

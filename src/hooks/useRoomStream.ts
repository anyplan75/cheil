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
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) throw new Error("poll failed");
        const data = (await res.json()) as RoomView;
        setRoom(data);
        setStatus("live");
        setError(null);
        timer = setTimeout(poll, 700);
      } catch {
        if (cancelled) return;
        setStatus("error");
        setError("연결이 끊겼습니다. 다시 연결 중…");
        timer = setTimeout(poll, 1500);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [code]);

  return { room, status, error };
}

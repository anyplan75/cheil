"use client";

import { useState } from "react";
import { useRoomStream } from "@/hooks/useRoomStream";
import { CaptionBoard } from "@/components/CaptionBoard";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { SpeakHelper } from "@/components/SpeakHelper";

export function StudentRoom({ code }: { code: string }) {
  const { room, status, error } = useRoomStream(code);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const captions = room?.captions ?? [];

  return (
    <div className="room-shell student-shell">
      <header className="room-header">
        <div>
          <p className="eyebrow">제일교회 AWANA · Student</p>
          <h1>Room {code}</h1>
        </div>
        <div className="status-pill" data-on={room?.teacherConnected}>
          <span className="status-dot" />
          {room?.teacherConnected ? "Teacher live" : "Waiting"}
        </div>
      </header>

      {status === "connecting" ? (
        <p className="muted">Connecting to room…</p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="caption-board">
        <div className="section-copy">
          <h2>Teacher said</h2>
          <p>
            선생님 말씀은 계속 쌓여 있어요. 모르는 단어를 누르면 영한 뜻과 발음을
            볼 수 있습니다.
            {captions.length > 0 ? ` (지금까지 ${captions.length}줄)` : ""}
          </p>
        </div>
        <CaptionBoard
          captions={captions}
          liveText={room?.liveText}
          onWordClick={setSelectedWord}
          emptyMessage="선생님이 말하기를 시작하면 자막이 여기에 쌓여요."
        />
      </section>

      <SpeakHelper />

      <DictionaryPanel
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
      />
    </div>
  );
}

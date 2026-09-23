"use client";

import { useState } from "react";
import { useRoomStream } from "@/hooks/useRoomStream";
import { CaptionText } from "@/components/CaptionText";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { SpeakHelper } from "@/components/SpeakHelper";

export function StudentRoom({ code }: { code: string }) {
  const { room, status, error } = useRoomStream(code);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

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
          <p>모르는 영어 단어를 누르면 영한 뜻과 발음을 확인할 수 있습니다.</p>
        </div>
        <div className="caption-scroll">
          {(room?.captions ?? []).map((line) => (
            <CaptionText
              key={line.id}
              text={line.text}
              onWordClick={setSelectedWord}
            />
          ))}
          {room?.liveText ? (
            <CaptionText
              text={room.liveText}
              live
              onWordClick={setSelectedWord}
            />
          ) : null}
          {!room?.captions?.length && !room?.liveText ? (
            <p className="muted">선생님이 말하기를 시작하면 자막이 여기에 보여요.</p>
          ) : null}
        </div>
      </section>

      <SpeakHelper />

      <DictionaryPanel
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
      />
    </div>
  );
}

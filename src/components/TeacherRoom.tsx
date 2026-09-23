"use client";

import { useCallback, useEffect, useState } from "react";
import { useSpeechCaptions } from "@/hooks/useSpeechCaptions";
import { useRoomStream } from "@/hooks/useRoomStream";
import { CaptionBoard } from "@/components/CaptionBoard";

async function postCaption(
  code: string,
  payload: Record<string, unknown>,
) {
  await fetch(`/api/rooms/${code}/captions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function TeacherRoom({ code }: { code: string }) {
  const [enabled, setEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const { room } = useRoomStream(code);

  const studentPath = `/room/${code}/student`;
  const studentUrl = origin ? `${origin}${studentPath}` : studentPath;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOrigin(window.location.origin);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    void postCaption(code, { type: "teacher", connected: true });
    return () => {
      void postCaption(code, { type: "teacher", connected: false });
    };
  }, [code]);

  const onLive = useCallback(
    (text: string) => {
      void postCaption(code, { type: "live", text });
    },
    [code],
  );

  const onFinal = useCallback(
    (text: string) => {
      void postCaption(code, { type: "final", text });
    },
    [code],
  );

  const { supported, listening, error } = useSpeechCaptions({
    enabled,
    onLive,
    onFinal,
  });

  async function copyStudentLink() {
    try {
      const value = `${window.location.origin}${studentPath}`;
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  async function clearAll() {
    const ok = window.confirm("지금까지 쌓인 자막을 모두 지울까요?");
    if (!ok) return;
    await postCaption(code, { type: "clear" });
  }

  const captions = room?.captions ?? [];
  const liveText = room?.liveText ?? "";

  return (
    <div className="room-shell">
      <header className="room-header">
        <div>
          <p className="eyebrow">서귀포 제일교회 AWANA · Teacher</p>
          <h1>Room {code}</h1>
        </div>
        <div className="status-pill" data-on={listening}>
          <span className="status-dot" />
          {listening ? "Listening" : "Paused"}
        </div>
      </header>

      <section className="link-row">
        <div>
          <p className="link-label">학생용 링크</p>
          <code>{studentUrl}</code>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={copyStudentLink}
        >
          {copied ? "Copied!" : "Copy student link"}
        </button>
      </section>

      <section className="teacher-controls">
        <button
          type="button"
          className={`mic-btn ${enabled ? "mic-btn--on" : ""}`}
          onClick={() => setEnabled((v) => !v)}
          disabled={!supported}
        >
          <span className="mic-pulse" aria-hidden />
          {enabled ? "Stop microphone" : "Start microphone"}
        </button>
        <button type="button" className="ghost-btn" onClick={clearAll}>
          Clear captions
        </button>
      </section>

      {!supported ? (
        <p className="error-text">
          Chrome 또는 Edge에서 열어 주세요. (Web Speech API 필요)
        </p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="caption-board">
        <div className="section-copy">
          <h2>Live captions</h2>
          <p>
            말한 내용은 계속 쌓입니다. 학생 화면에도 같은 기록이 남습니다.
            {captions.length > 0 ? ` (지금까지 ${captions.length}줄)` : ""}
          </p>
        </div>
        <CaptionBoard
          captions={captions}
          liveText={liveText}
          emptyMessage="마이크를 켠 뒤 영어로 말해 보세요."
        />
      </section>
    </div>
  );
}

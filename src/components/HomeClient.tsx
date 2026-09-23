"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatRoomCode } from "@/lib/text";

export function HomeClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [created, setCreated] = useState<{
    code: string;
    teacherUrl: string;
    studentUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState<"teacher" | "student" | null>(null);

  async function createRoom() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) throw new Error(data.error || "failed");
      const origin = window.location.origin;
      setCreated({
        code: data.code,
        teacherUrl: `${origin}/room/${data.code}/teacher`,
        studentUrl: `${origin}/room/${data.code}/student`,
      });
    } catch {
      setError("방을 만들지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    const code = formatRoomCode(joinCode);
    if (code.length < 4) {
      setError("방 코드를 확인해 주세요.");
      return;
    }
    router.push(`/room/${code}/student`);
  }

  async function copy(kind: "teacher" | "student", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="home">
      <div className="home-atmosphere" aria-hidden />
      <section className="hero">
        <p className="brand-mark animate-rise">서귀포 제일교회</p>
        <h1 className="brand-title animate-rise delay-1">AWANA English</h1>
        <p className="hero-lead animate-rise delay-2">
          교사가 영어로 말하면 실시간 자막이 생기고, 학생은 모르는 단어를 눌러
          뜻을 보고, 하고 싶은 말을 적으면 영어 표현을 받습니다.
        </p>
        <div className="hero-actions animate-rise delay-3">
          <button
            type="button"
            className="primary-btn"
            onClick={createRoom}
            disabled={busy}
          >
            {busy ? "만드는 중…" : "수업 방 만들기"}
          </button>
        </div>
      </section>

      {error ? <p className="error-text home-error">{error}</p> : null}

      {created ? (
        <section className="created-panel animate-rise">
          <p className="eyebrow">Room {created.code}</p>
          <div className="link-stack">
            <article>
              <h2>교사용 링크</h2>
              <code>{created.teacherUrl}</code>
              <div className="row-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => copy("teacher", created.teacherUrl)}
                >
                  {copied === "teacher" ? "Copied!" : "Copy"}
                </button>
                <a className="primary-btn" href={created.teacherUrl}>
                  Open teacher
                </a>
              </div>
            </article>
            <article>
              <h2>학생용 링크</h2>
              <code>{created.studentUrl}</code>
              <div className="row-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => copy("student", created.studentUrl)}
                >
                  {copied === "student" ? "Copied!" : "Copy"}
                </button>
                <a className="secondary-btn" href={created.studentUrl}>
                  Open student
                </a>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <section className="join-panel">
        <h2>이미 방이 있나요?</h2>
        <p>방 코드로 학생 화면에 입장합니다.</p>
        <form className="join-form" onSubmit={joinRoom}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            maxLength={6}
            aria-label="Room code"
          />
          <button type="submit" className="secondary-btn">
            Join as student
          </button>
        </form>
      </section>
    </main>
  );
}

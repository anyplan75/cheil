"use client";

import { FormEvent, useState } from "react";

type Suggestion = {
  english: string;
};

function speakEnglish(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

export function SpeakHelper() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = (await res.json()) as {
        suggestions?: Suggestion[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "failed");
      setSuggestions(data.suggestions ?? []);
    } catch {
      setError("영어 표현을 찾지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function onPlay(english: string) {
    setPlaying(english);
    speakEnglish(english);
    window.setTimeout(() => setPlaying(null), 1600);
  }

  return (
    <section className="helper-card">
      <div className="section-copy">
        <h2>말하고 싶은 내용</h2>
        <p>한국어로 적으면, 영어로 어떤 말을 하면 좋은지 알려줍니다.</p>
      </div>

      <form className="helper-form" onSubmit={onSubmit}>
        <label htmlFor="want-to-say" className="sr-only">
          말하고 싶은 내용
        </label>
        <textarea
          id="want-to-say"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예: 안녕하세요, 제 이름은 민수예요 / 화장실 어디에 있어요?"
          rows={3}
        />
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "찾는 중…" : "영어 표현 보기"}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}

      {suggestions.length > 0 ? (
        <ul className="suggest-list">
          {suggestions.map((item) => (
            <li key={item.english}>
              <div className="suggest-row">
                <p className="suggest-en">{item.english}</p>
                <button
                  type="button"
                  className={`speak-btn ${playing === item.english ? "speak-btn--on" : ""}`}
                  onClick={() => onPlay(item.english)}
                  aria-label="영어 문장 듣기"
                  title="영어 문장 듣기"
                >
                  🔊 듣기
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

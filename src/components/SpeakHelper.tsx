"use client";

import { FormEvent, useState } from "react";

type Suggestion = {
  english: string;
  note: string;
};

export function SpeakHelper() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

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

  return (
    <section className="helper-card">
      <div className="section-copy">
        <h2>말하고 싶은 내용</h2>
        <p>한국어로 적으면, 영어로 어떤 단어를 쓰면 좋은지 알려줍니다.</p>
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
            <li key={`${item.english}-${item.note}`}>
              <p className="suggest-en">{item.english}</p>
              <p className="suggest-note">{item.note}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

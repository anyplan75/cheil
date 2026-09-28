"use client";

import { useEffect, useState } from "react";
import { playDictionaryAudio } from "@/lib/speak";

type Meaning = {
  partOfSpeech: string;
  partOfSpeechKo: string;
  definitions: {
    definition: string;
    definitionKo: string;
    example?: string;
  }[];
  synonyms?: string[];
};

type DictionaryResult = {
  word: string;
  found: boolean;
  phonetic: string;
  audioUrl: string;
  glossKo: string;
  meanings: Meaning[];
};

function DictionaryContent({
  word,
  onClose,
}: {
  word: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/dictionary/${encodeURIComponent(word)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("lookup failed");
        return res.json() as Promise<DictionaryResult>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("사전을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, [word]);

  function onPlay() {
    setPlaying(true);
    playDictionaryAudio(word, data?.audioUrl);
    window.setTimeout(() => setPlaying(false), 1400);
  }

  return (
    <aside className="dict-panel" role="dialog" aria-label="영한 사전">
      <div className="dict-panel__head">
        <div>
          <p className="dict-panel__label">영한 사전</p>
          <div className="dict-panel__word-row">
            <h2 className="dict-panel__word">{word}</h2>
            <button
              type="button"
              className={`speak-btn ${playing ? "speak-btn--on" : ""}`}
              onClick={onPlay}
              aria-label="발음 듣기"
              title="발음 듣기"
            >
              🔊 발음
            </button>
          </div>
          <div className="dict-panel__meta">
            {data?.phonetic ? (
              <span className="dict-panel__phonetic">{data.phonetic}</span>
            ) : null}
            {data?.glossKo ? (
              <span className="dict-panel__gloss">{data.glossKo}</span>
            ) : null}
          </div>
        </div>
        <button type="button" className="ghost-btn" onClick={onClose}>
          닫기
        </button>
      </div>

      {loading ? <p className="muted">찾는 중…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && data && !data.found ? (
        <p className="muted">사전에서 이 단어를 찾지 못했습니다.</p>
      ) : null}

      {!loading && data?.found
        ? data.meanings.map((meaning) => (
            <section
              key={`${meaning.partOfSpeech}-${meaning.partOfSpeechKo}`}
              className="dict-meaning"
            >
              <h3>
                {meaning.partOfSpeechKo}
                <span className="dict-pos-en">{meaning.partOfSpeech}</span>
              </h3>
              <ol>
                {meaning.definitions.map((def) => (
                  <li key={`${def.definition}-${def.definitionKo}`}>
                    {def.definitionKo ? (
                      <p className="dict-ko">{def.definitionKo}</p>
                    ) : null}
                    <p className="dict-en">{def.definition}</p>
                    {def.example ? (
                      <p className="dict-example">예: “{def.example}”</p>
                    ) : null}
                  </li>
                ))}
              </ol>
              {meaning.synonyms && meaning.synonyms.length > 0 ? (
                <p className="dict-synonyms">
                  비슷한 말: {meaning.synonyms.join(", ")}
                </p>
              ) : null}
            </section>
          ))
        : null}
    </aside>
  );
}

export function DictionaryPanel({
  word,
  onClose,
}: {
  word: string | null;
  onClose: () => void;
}) {
  if (!word) return null;
  return <DictionaryContent key={word} word={word} onClose={onClose} />;
}

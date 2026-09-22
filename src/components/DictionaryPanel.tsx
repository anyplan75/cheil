"use client";

import { useEffect, useState } from "react";

type Meaning = {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms?: string[];
};

type DictionaryResult = {
  word: string;
  found: boolean;
  phonetic: string;
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
    };
  }, [word]);

  return (
    <aside className="dict-panel" role="dialog" aria-label="English dictionary">
      <div className="dict-panel__head">
        <div>
          <p className="dict-panel__label">Dictionary</p>
          <h2 className="dict-panel__word">{word}</h2>
          {data?.phonetic ? (
            <p className="dict-panel__phonetic">{data.phonetic}</p>
          ) : null}
        </div>
        <button type="button" className="ghost-btn" onClick={onClose}>
          Close
        </button>
      </div>

      {loading ? <p className="muted">Looking up…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && data && !data.found ? (
        <p className="muted">사전에서 이 단어를 찾지 못했습니다.</p>
      ) : null}

      {!loading && data?.found
        ? data.meanings.map((meaning) => (
            <section key={meaning.partOfSpeech} className="dict-meaning">
              <h3>{meaning.partOfSpeech}</h3>
              <ol>
                {meaning.definitions.map((def) => (
                  <li key={def.definition}>
                    <p>{def.definition}</p>
                    {def.example ? (
                      <p className="dict-example">“{def.example}”</p>
                    ) : null}
                  </li>
                ))}
              </ol>
              {meaning.synonyms && meaning.synonyms.length > 0 ? (
                <p className="dict-synonyms">
                  Synonyms: {meaning.synonyms.join(", ")}
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

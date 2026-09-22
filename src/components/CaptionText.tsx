"use client";

import { tokenizeCaption } from "@/lib/text";

export function CaptionText({
  text,
  live = false,
  onWordClick,
}: {
  text: string;
  live?: boolean;
  onWordClick?: (word: string) => void;
}) {
  const tokens = tokenizeCaption(text);

  return (
    <p className={`caption-line ${live ? "caption-line--live" : ""}`}>
      {tokens.map(({ token, isWord }, index) =>
        isWord && onWordClick ? (
          <button
            key={`${token}-${index}`}
            type="button"
            className="word-btn"
            onClick={() => onWordClick(token)}
          >
            {token}
          </button>
        ) : (
          <span key={`${token}-${index}`}>{token}</span>
        ),
      )}
    </p>
  );
}

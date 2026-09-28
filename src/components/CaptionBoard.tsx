"use client";

import { useEffect, useRef } from "react";
import { CaptionText } from "@/components/CaptionText";

type CaptionLine = {
  id: string;
  text: string;
};

export function CaptionBoard({
  captions,
  liveText,
  onWordClick,
  emptyMessage,
}: {
  captions: CaptionLine[];
  liveText?: string;
  onWordClick?: (word: string) => void;
  emptyMessage: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [captions, liveText]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < 48;
  }

  return (
    <div
      className="caption-scroll"
      ref={scrollerRef}
      onScroll={onScroll}
    >
      {captions.map((line) => (
        <CaptionText
          key={line.id}
          text={line.text}
          onWordClick={onWordClick}
        />
      ))}
      {liveText ? (
        <CaptionText text={liveText} live onWordClick={onWordClick} />
      ) : null}
      {!captions.length && !liveText ? (
        <p className="muted">{emptyMessage}</p>
      ) : null}
    </div>
  );
}

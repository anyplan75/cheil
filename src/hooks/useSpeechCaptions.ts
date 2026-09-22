"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

function getSpeechCtor() {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechCaptions(opts: {
  enabled: boolean;
  onLive: (text: string) => void;
  onFinal: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const onLiveRef = useRef(opts.onLive);
  const onFinalRef = useRef(opts.onFinal);

  useEffect(() => {
    onLiveRef.current = opts.onLive;
    onFinalRef.current = opts.onFinal;
  }, [opts.onLive, opts.onFinal]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSupported(Boolean(getSpeechCtor()));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const attachRecognition = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (interim) onLiveRef.current(interim.trim());
      if (finalText.trim()) onFinalRef.current(finalText.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(`음성 인식 오류: ${event.error}`);
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
          setListening(true);
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    return recognition;
  }, []);

  useEffect(() => {
    if (!opts.enabled) {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      const timer = window.setTimeout(() => setListening(false), 0);
      return () => window.clearTimeout(timer);
    }

    shouldListenRef.current = true;
    const recognition = attachRecognition();
    if (!recognition) {
      const timer = window.setTimeout(() => {
        setError(
          "이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해 주세요.",
        );
      }, 0);
      return () => window.clearTimeout(timer);
    }

    recognitionRef.current = recognition;
    const timer = window.setTimeout(() => {
      try {
        setError(null);
        recognition.start();
        setListening(true);
      } catch {
        setError("마이크를 시작할 수 없습니다. 권한을 확인해 주세요.");
        setListening(false);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      shouldListenRef.current = false;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [opts.enabled, attachRecognition]);

  return { supported, listening, error };
}

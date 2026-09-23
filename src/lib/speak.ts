const PREFERRED_VOICE_NAMES = [
  "google us english",
  "google uk english female",
  "google uk english male",
  "microsoft aria online",
  "microsoft jenny online",
  "microsoft guy online",
  "microsoft ana online",
  "microsoft michelle online",
  "microsoft andrew online",
  "microsoft emma online",
  "microsoft ryan online",
  "samantha",
  "karen",
  "moira",
  "tessa",
  "daniel",
  "alex",
  "victoria",
  "karen",
];

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const synth = window.speechSynthesis;
      const current = synth.getVoices();
      if (current.length > 0) {
        resolve(current);
        return;
      }

      const done = () => {
        resolve(synth.getVoices());
        synth.removeEventListener("voiceschanged", done);
      };
      synth.addEventListener("voiceschanged", done);
      // Fallback if voiceschanged never fires.
      window.setTimeout(() => resolve(synth.getVoices()), 400);
    });
  }

  return voicesReady;
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  if (lang.startsWith("en-us")) score += 40;
  else if (lang.startsWith("en-gb")) score += 30;
  else if (lang.startsWith("en")) score += 20;
  else return -100;

  const preferredIndex = PREFERRED_VOICE_NAMES.findIndex((item) =>
    name.includes(item),
  );
  if (preferredIndex >= 0) score += 100 - preferredIndex;

  if (name.includes("natural") || name.includes("neural") || name.includes("online")) {
    score += 25;
  }
  if (name.includes("enhanced") || name.includes("premium")) score += 15;
  if (name.includes("female") || name.includes("woman")) score += 5;

  // Avoid low-quality / novelty voices.
  if (
    name.includes("whisper") ||
    name.includes("zarvox") ||
    name.includes("bad news") ||
    name.includes("bahh") ||
    name.includes("bells") ||
    name.includes("boing") ||
    name.includes("bubbles") ||
    name.includes("cellos") ||
    name.includes("dumb") ||
    name.includes("good news") ||
    name.includes("hysterical") ||
    name.includes("pipe organ") ||
    name.includes("trinoids") ||
    name.includes("jester")
  ) {
    score -= 80;
  }

  if (voice.localService) score += 2;
  return score;
}

async function pickEnglishVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  if (voices.length === 0) return null;

  const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return ranked[0] && scoreVoice(ranked[0]) > 0 ? ranked[0] : null;
}

export async function speakEnglish(text: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  // Chrome can chop the first syllable if speak() follows cancel() immediately.
  await new Promise((resolve) => window.setTimeout(resolve, 60));

  const voice = await pickEnglishVoice();
  const utter = new SpeechSynthesisUtterance(cleaned);
  utter.lang = voice?.lang || "en-US";
  utter.rate = 0.92;
  utter.pitch = 1;
  utter.volume = 1;
  if (voice) utter.voice = voice;

  synth.speak(utter);
}

export function playDictionaryAudio(word: string, audioUrl?: string) {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    void audio.play().catch(() => {
      void speakEnglish(word);
    });
    return;
  }
  void speakEnglish(word);
}

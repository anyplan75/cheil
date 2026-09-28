import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ word: string }> };

type DictionaryMeaning = {
  partOfSpeech: string;
  partOfSpeechKo: string;
  definitions: {
    definition: string;
    definitionKo: string;
    example?: string;
  }[];
  synonyms?: string[];
};

type DictionaryPayload = {
  word: string;
  found: boolean;
  phonetic: string;
  audioUrl: string;
  glossKo: string;
  meanings: DictionaryMeaning[];
};

const POS_KO: Record<string, string> = {
  noun: "명사",
  verb: "동사",
  adjective: "형용사",
  adverb: "부사",
  pronoun: "대명사",
  preposition: "전치사",
  conjunction: "접속사",
  interjection: "감탄사",
  determiner: "한정사",
  n: "명사",
  v: "동사",
  adj: "형용사",
  adv: "부사",
  u: "기타",
};

function cleanWord(raw: string) {
  return decodeURIComponent(raw)
    .toLowerCase()
    .replace(/[^a-z'-]/g, "");
}

async function translateEnToKo(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 450))}&langpair=en|ko`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const out = (data.responseData?.translatedText ?? "").trim();
    if (!out || out.toLowerCase() === trimmed.toLowerCase()) return "";
    return out;
  } catch {
    return "";
  }
}

function cleanDefinition(text: string) {
  return text
    .replace(/^\([^)]*\)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortenGloss(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  // Keep the first clause as a short header gloss.
  const cut = cleaned.split(/[.;]/)[0]?.trim() || cleaned;
  return cut.length > 40 ? `${cut.slice(0, 40)}…` : cut;
}

async function translateWordGloss(word: string): Promise<string> {
  const tagged = await translateEnToKo(`${word} (English)`);
  if (tagged) {
    const cleaned = tagged
      .replace(/\(영어\)/g, "")
      .replace(/영어/g, "")
      .trim();
    if (cleaned && cleaned.length <= 24) return cleaned;
  }
  return "";
}

async function fromDictionaryApi(word: string): Promise<DictionaryPayload | null> {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    { signal: AbortSignal.timeout(5000) },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    word: string;
    phonetic?: string;
    phonetics?: { text?: string; audio?: string }[];
    meanings: Array<{
      partOfSpeech: string;
      definitions: Array<{ definition: string; example?: string }>;
      synonyms?: string[];
    }>;
  }>;

  const entry = data[0];
  if (!entry) return null;

  const phonetic =
    entry.phonetic ||
    entry.phonetics?.find((p) => p.text)?.text ||
    "";
  const audioUrl =
    entry.phonetics?.find((p) => p.audio)?.audio ||
    entry.phonetics?.find((p) => p.audio?.includes("us"))?.audio ||
    "";

  const rawMeanings = (entry.meanings ?? []).slice(0, 3).map((m) => ({
    partOfSpeech: m.partOfSpeech,
    partOfSpeechKo: POS_KO[m.partOfSpeech.toLowerCase()] || m.partOfSpeech,
    defs: m.definitions.slice(0, 2),
    synonyms: (m.synonyms ?? []).slice(0, 5),
  }));

  const textsToTranslate = rawMeanings.flatMap((m) =>
    m.defs.map((d) => cleanDefinition(d.definition)),
  );

  const translations = await Promise.all(
    textsToTranslate.map((t) => translateEnToKo(t)),
  );
  let ti = 0;

  const meanings: DictionaryMeaning[] = rawMeanings.map((m) => ({
    partOfSpeech: m.partOfSpeech,
    partOfSpeechKo: m.partOfSpeechKo,
    synonyms: m.synonyms,
    definitions: m.defs.map((d) => {
      const definition = cleanDefinition(d.definition);
      const definitionKo = translations[ti] || "";
      ti += 1;
      return {
        definition,
        definitionKo,
        example: d.example,
      };
    }),
  }));

  const glossKo = shortenGloss(
    meanings
      .flatMap((m) => m.definitions)
      .find((d) => d.definitionKo)?.definitionKo || "",
  );

  return {
    word: entry.word ?? word,
    found: true,
    phonetic,
    audioUrl,
    glossKo,
    meanings,
  };
}

async function fromDatamuse(word: string): Promise<DictionaryPayload | null> {
  const res = await fetch(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`,
    { signal: AbortSignal.timeout(5000) },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    word: string;
    defs?: string[];
  }>;
  const entry = data[0];
  if (!entry?.defs?.length) return null;

  const byPos = new Map<string, string[]>();
  for (const def of entry.defs.slice(0, 6)) {
    const [pos, ...rest] = def.split("\t");
    const definition = rest.join("\t").trim();
    if (!definition) continue;
    const partOfSpeech = POS_KO[pos] ? pos : pos || "u";
    const list = byPos.get(partOfSpeech) ?? [];
    list.push(definition);
    byPos.set(partOfSpeech, list);
  }

  const entries = [...byPos.entries()].slice(0, 3);
  const meanings: DictionaryMeaning[] = [];

  for (const [pos, defs] of entries) {
    const sliced = defs.slice(0, 2).map(cleanDefinition);
    const kos = await Promise.all(sliced.map((d) => translateEnToKo(d)));
    meanings.push({
      partOfSpeech: pos,
      partOfSpeechKo: POS_KO[pos] || pos,
      definitions: sliced.map((definition, i) => ({
        definition,
        definitionKo: kos[i] || "",
      })),
    });
  }

  if (meanings.length === 0) return null;

  const glossKo = shortenGloss(
    meanings
      .flatMap((m) => m.definitions)
      .find((d) => d.definitionKo)?.definitionKo || "",
  );

  return {
    word: entry.word ?? word,
    found: true,
    phonetic: "",
    audioUrl: "",
    glossKo,
    meanings,
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { word } = await params;
  const cleaned = cleanWord(word);

  if (!cleaned) {
    return NextResponse.json({ error: "Invalid word" }, { status: 400 });
  }

  try {
    const primary = await fromDictionaryApi(cleaned).catch(() => null);
    if (primary) return NextResponse.json(primary);

    const fallback = await fromDatamuse(cleaned).catch(() => null);
    if (fallback) return NextResponse.json(fallback);

    const glossKo = await translateWordGloss(cleaned);
    if (glossKo) {
      return NextResponse.json({
        word: cleaned,
        found: true,
        phonetic: "",
        audioUrl: "",
        glossKo,
        meanings: [
          {
            partOfSpeech: "word",
            partOfSpeechKo: "의미",
            definitions: [
              {
                definition: cleaned,
                definitionKo: glossKo,
              },
            ],
          },
        ],
      } satisfies DictionaryPayload);
    }

    return NextResponse.json({
      word: cleaned,
      found: false,
      meanings: [] as DictionaryMeaning[],
      phonetic: "",
      audioUrl: "",
      glossKo: "",
    });
  } catch {
    return NextResponse.json(
      { error: "Dictionary lookup failed" },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ word: string }> };

type DictionaryMeaning = {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms?: string[];
};

type DictionaryPayload = {
  word: string;
  found: boolean;
  phonetic: string;
  meanings: DictionaryMeaning[];
};

function cleanWord(raw: string) {
  return decodeURIComponent(raw)
    .toLowerCase()
    .replace(/[^a-z'-]/g, "");
}

async function fromDictionaryApi(word: string): Promise<DictionaryPayload | null> {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    { signal: AbortSignal.timeout(4000) },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    word: string;
    phonetic?: string;
    phonetics?: { text?: string }[];
    meanings: Array<{
      partOfSpeech: string;
      definitions: Array<{ definition: string; example?: string }>;
      synonyms?: string[];
    }>;
  }>;

  const entry = data[0];
  if (!entry) return null;

  return {
    word: entry.word ?? word,
    found: true,
    phonetic:
      entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || "",
    meanings: (entry.meanings ?? []).slice(0, 3).map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.slice(0, 2).map((d) => ({
        definition: d.definition,
        example: d.example,
      })),
      synonyms: (m.synonyms ?? []).slice(0, 5),
    })),
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

  const posLabels: Record<string, string> = {
    n: "noun",
    v: "verb",
    adj: "adjective",
    adv: "adverb",
    u: "other",
  };

  const byPos = new Map<string, { definition: string }[]>();
  for (const def of entry.defs.slice(0, 8)) {
    const [pos, ...rest] = def.split("\t");
    const definition = rest.join("\t").trim();
    if (!definition) continue;
    const partOfSpeech = posLabels[pos] || pos || "definition";
    const list = byPos.get(partOfSpeech) ?? [];
    list.push({ definition });
    byPos.set(partOfSpeech, list);
  }

  const meanings: DictionaryMeaning[] = [...byPos.entries()]
    .slice(0, 3)
    .map(([partOfSpeech, definitions]) => ({
      partOfSpeech,
      definitions: definitions.slice(0, 2),
    }));

  if (meanings.length === 0) return null;

  return {
    word: entry.word ?? word,
    found: true,
    phonetic: "",
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

    return NextResponse.json({
      word: cleaned,
      found: false,
      meanings: [] as DictionaryMeaning[],
      phonetic: "",
    });
  } catch {
    return NextResponse.json(
      { error: "Dictionary lookup failed" },
      { status: 502 },
    );
  }
}

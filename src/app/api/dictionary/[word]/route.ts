import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ word: string }> };

type DictionaryMeaning = {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms?: string[];
};

export async function GET(_request: Request, { params }: Params) {
  const { word } = await params;
  const cleaned = decodeURIComponent(word)
    .toLowerCase()
    .replace(/[^a-z'-]/g, "");

  if (!cleaned) {
    return NextResponse.json({ error: "Invalid word" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleaned)}`,
      { next: { revalidate: 86400 } },
    );

    if (!res.ok) {
      return NextResponse.json(
        {
          word: cleaned,
          found: false,
          meanings: [] as DictionaryMeaning[],
          phonetic: "",
        },
        { status: 200 },
      );
    }

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
    const meanings: DictionaryMeaning[] = (entry.meanings ?? [])
      .slice(0, 3)
      .map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.slice(0, 2).map((d) => ({
          definition: d.definition,
          example: d.example,
        })),
        synonyms: (m.synonyms ?? []).slice(0, 5),
      }));

    return NextResponse.json({
      word: entry.word ?? cleaned,
      found: true,
      phonetic:
        entry.phonetic ||
        entry.phonetics?.find((p) => p.text)?.text ||
        "",
      meanings,
    });
  } catch {
    return NextResponse.json(
      { error: "Dictionary lookup failed" },
      { status: 502 },
    );
  }
}

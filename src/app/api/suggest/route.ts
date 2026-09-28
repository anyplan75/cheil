import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Suggestion = {
  english: string;
};

function splitIdeas(input: string): string[] {
  return input
    .split(/[,/\n]|그리고|하고/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

async function translateKoToEn(text: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("translate failed");
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
  };
  return (data.responseData?.translatedText ?? "").trim();
}

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  const ideas = splitIdeas(text);
  const suggestions: Suggestion[] = [];

  try {
    const full = await translateKoToEn(text);
    if (full) {
      suggestions.push({ english: full });
    }

    for (const idea of ideas) {
      if (idea === text && ideas.length === 1) continue;
      const piece = await translateKoToEn(idea);
      if (!piece) continue;
      suggestions.push({ english: piece });
    }

    const seen = new Set<string>();
    const unique = suggestions.filter((s) => {
      const key = s.english.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      input: text,
      suggestions: unique.slice(0, 6),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not suggest English words right now." },
      { status: 502 },
    );
  }
}

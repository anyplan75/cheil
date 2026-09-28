export function tokenizeCaption(text: string): { token: string; isWord: boolean }[] {
  const parts = text.split(/([A-Za-z]+(?:'[A-Za-z]+)?)/);
  return parts
    .filter((p) => p.length > 0)
    .map((token) => ({
      token,
      isWord: /^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(token),
    }));
}

export function formatRoomCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

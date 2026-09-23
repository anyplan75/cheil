export type CaptionEntry = {
  id: string;
  text: string;
  final: boolean;
  at: number;
};

export type Room = {
  code: string;
  createdAt: number;
  updatedAt: number;
  teacherConnected: boolean;
  captions: CaptionEntry[];
  liveText: string;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KV_NS =
  process.env.AWANA_KV_NAMESPACE || "p-cheil-awana-7f5b0c3e";
const KV_BASE = `https://technocore.chat/kv/${KV_NS}`;

declare global {
  var __awanaRooms: Map<string, Room> | undefined;
  var __awanaListeners: Map<string, Set<(room: Room) => void>> | undefined;
  var __awanaLiveTimers: Map<string, ReturnType<typeof setTimeout>> | undefined;
}

function memoryStore() {
  if (!globalThis.__awanaRooms) globalThis.__awanaRooms = new Map();
  return globalThis.__awanaRooms;
}

function listeners() {
  if (!globalThis.__awanaListeners) {
    globalThis.__awanaListeners = new Map();
  }
  return globalThis.__awanaListeners;
}

function liveTimers() {
  if (!globalThis.__awanaLiveTimers) {
    globalThis.__awanaLiveTimers = new Map();
  }
  return globalThis.__awanaLiveTimers;
}

export function createRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function kvKey(code: string) {
  return normalizeCode(code).toLowerCase();
}

function parseKvBody(raw: string): Room | null {
  const start = raw.indexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(raw.slice(start)) as Room;
  } catch {
    return null;
  }
}

async function kvGet(code: string): Promise<Room | undefined> {
  try {
    const res = await fetch(`${KV_BASE}/${kvKey(code)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return undefined;
    const room = parseKvBody(await res.text());
    return room ?? undefined;
  } catch {
    return undefined;
  }
}

async function kvSet(room: Room): Promise<void> {
  await fetch(`${KV_BASE}/${kvKey(room.code)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: JSON.stringify(room) }),
    signal: AbortSignal.timeout(6000),
  });
}

function notify(room: Room) {
  const set = listeners().get(room.code);
  if (!set) return;
  for (const listener of set) listener(room);
}

async function saveRoom(room: Room): Promise<Room> {
  room.updatedAt = Date.now();
  memoryStore().set(room.code, room);
  try {
    await kvSet(room);
  } catch {
    /* local/memory still works for single-instance */
  }
  notify(room);
  return room;
}

export async function createRoom(): Promise<Room> {
  let code = createRoomCode();
  for (let i = 0; i < 5; i += 1) {
    const existing = await getRoom(code);
    if (!existing) break;
    code = createRoomCode();
  }

  const room: Room = {
    code,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    teacherConnected: false,
    captions: [],
    liveText: "",
  };
  return saveRoom(room);
}

export async function getRoom(code: string): Promise<Room | undefined> {
  const normalized = normalizeCode(code);
  if (!normalized) return undefined;

  const cached = memoryStore().get(normalized);
  const remote = await kvGet(normalized);
  if (remote) {
    memoryStore().set(normalized, remote);
    return remote;
  }
  return cached;
}

export async function ensureRoom(code: string): Promise<Room> {
  const normalized = normalizeCode(code);
  const existing = await getRoom(normalized);
  if (existing) return existing;

  const room: Room = {
    code: normalized,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    teacherConnected: false,
    captions: [],
    liveText: "",
  };
  return saveRoom(room);
}

export async function touchTeacher(
  code: string,
  connected: boolean,
): Promise<Room | undefined> {
  const room = await ensureRoom(code);
  room.teacherConnected = connected;
  return saveRoom(room);
}

export async function updateLiveCaption(
  code: string,
  text: string,
): Promise<Room | undefined> {
  const room = await ensureRoom(code);
  room.liveText = text;
  room.updatedAt = Date.now();
  memoryStore().set(room.code, room);
  notify(room);

  // Throttle remote writes — interim speech updates are very frequent.
  const key = room.code;
  const timers = liveTimers();
  if (!timers.has(key)) {
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        const latest = memoryStore().get(key);
        if (latest) void kvSet(latest).catch(() => undefined);
      }, 900),
    );
  }
  return room;
}

export async function appendFinalCaption(
  code: string,
  text: string,
): Promise<Room | undefined> {
  const room = await ensureRoom(code);
  const cleaned = text.trim();
  if (!cleaned) return room;

  room.captions.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: cleaned,
    final: true,
    at: Date.now(),
  });
  if (room.captions.length > 80) {
    room.captions = room.captions.slice(-80);
  }
  room.liveText = "";
  return saveRoom(room);
}

export async function clearCaptions(code: string): Promise<Room | undefined> {
  const room = await ensureRoom(code);
  room.captions = [];
  room.liveText = "";
  return saveRoom(room);
}

export function subscribe(
  code: string,
  listener: (room: Room) => void,
): () => void {
  const key = normalizeCode(code);
  const map = listeners();
  const set = map.get(key) ?? new Set();
  set.add(listener);
  map.set(key, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) map.delete(key);
  };
}

export function publicRoomView(room: Room) {
  return {
    code: room.code,
    teacherConnected: room.teacherConnected,
    liveText: room.liveText,
    captions: room.captions,
    updatedAt: room.updatedAt,
  };
}

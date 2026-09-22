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

type RoomStore = Map<string, Room>;

declare global {
  var __awanaRooms: RoomStore | undefined;
  var __awanaListeners: Map<string, Set<(room: Room) => void>> | undefined;
}

function getStore(): RoomStore {
  if (!globalThis.__awanaRooms) {
    globalThis.__awanaRooms = new Map();
  }
  return globalThis.__awanaRooms;
}

function getListeners() {
  if (!globalThis.__awanaListeners) {
    globalThis.__awanaListeners = new Map();
  }
  return globalThis.__awanaListeners;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function createRoom(): Room {
  const store = getStore();
  let code = createRoomCode();
  while (store.has(code)) {
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
  store.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return getStore().get(code.toUpperCase());
}

export function ensureRoom(code: string): Room {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const existing = getStore().get(normalized);
  if (existing) return existing;

  const room: Room = {
    code: normalized,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    teacherConnected: false,
    captions: [],
    liveText: "",
  };
  getStore().set(normalized, room);
  return room;
}

export function touchTeacher(code: string, connected: boolean): Room | undefined {
  const room = getRoom(code);
  if (!room) return undefined;
  room.teacherConnected = connected;
  room.updatedAt = Date.now();
  notify(room);
  return room;
}

export function updateLiveCaption(code: string, text: string): Room | undefined {
  const room = getRoom(code);
  if (!room) return undefined;
  room.liveText = text;
  room.updatedAt = Date.now();
  notify(room);
  return room;
}

export function appendFinalCaption(code: string, text: string): Room | undefined {
  const room = getRoom(code);
  if (!room) return undefined;
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
  room.updatedAt = Date.now();
  notify(room);
  return room;
}

export function clearCaptions(code: string): Room | undefined {
  const room = getRoom(code);
  if (!room) return undefined;
  room.captions = [];
  room.liveText = "";
  room.updatedAt = Date.now();
  notify(room);
  return room;
}

export function subscribe(code: string, listener: (room: Room) => void): () => void {
  const key = code.toUpperCase();
  const listeners = getListeners();
  const set = listeners.get(key) ?? new Set();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

function notify(room: Room) {
  const listeners = getListeners().get(room.code);
  if (!listeners) return;
  for (const listener of listeners) {
    listener(room);
  }
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

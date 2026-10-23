/**
 * Таблица лучших результатов. Хранится в localStorage браузера игрока:
 * GitHub Pages — статический хостинг, общего сервера у игры нет, поэтому рекорды у каждого браузера свои.
 *
 * Имя игрока: браузер не отдаёт странице имя пользователя ОС или аккаунта (это закрыто из соображений приватности),
 * поэтому имя запоминается в localStorage при первом вводе и дальше подставляется автоматически.
 */

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  /** Время игры в формате «мм:сс». */
  time: string;
  won: boolean;
  /** Unix-время записи, мс. */
  date: number;
}

const ENTRIES_KEY = "elevator-to-hell:leaderboard:v1";
const NAME_KEY = "elevator-to-hell:player-name:v1";
export const LEADERBOARD_SIZE = 10;
export const DEFAULT_NAME = "Гравець";
const MAX_NAME = 20;

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // хранилище может быть заблокировано (приватный режим, запрет cookies)
  }
};

const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Рекорды — второстепенная функция: сбой хранилища не должен ломать экран окончания игры.
  }
};

export function cleanName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  return name || DEFAULT_NAME;
}

export function getPlayerName(): string {
  const saved = read(NAME_KEY);
  return saved ? cleanName(saved) : DEFAULT_NAME;
}

export function hasPlayerName(): boolean {
  return !!read(NAME_KEY);
}

export function setPlayerName(raw: string): string {
  const name = cleanName(raw);
  write(NAME_KEY, name);
  return name;
}

export function loadEntries(): LeaderboardEntry[] {
  const raw = read(ENTRIES_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((e) => e && typeof e.id === "string" && typeof e.score === "number")
      .map((e) => ({
        id: e.id,
        name: cleanName(String(e.name ?? "")),
        score: Math.round(e.score),
        time: String(e.time ?? ""),
        won: !!e.won,
        date: Number(e.date) || 0,
      }));
  } catch {
    return [];
  }
}

const sortEntries = (list: LeaderboardEntry[]) =>
  list.sort((a, b) => b.score - a.score || a.date - b.date);

/** Добавляет результат и возвращает топ-N вместе с записью текущей игры (она может не попасть в топ). */
export function addEntry(entry: Omit<LeaderboardEntry, "id" | "date">): { top: LeaderboardEntry[]; current: LeaderboardEntry } {
  const current: LeaderboardEntry = {
    ...entry,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    date: Date.now(),
  };
  const all = sortEntries([...loadEntries(), current]).slice(0, LEADERBOARD_SIZE);
  write(ENTRIES_KEY, JSON.stringify(all));
  return { top: all, current };
}

/** Переименовывает запись и запоминает имя для следующих игр. */
export function renameEntry(id: string, raw: string): { top: LeaderboardEntry[]; name: string } {
  const name = setPlayerName(raw);
  const all = loadEntries();
  const found = all.find((e) => e.id === id);
  if (found) {
    found.name = name;
    write(ENTRIES_KEY, JSON.stringify(sortEntries(all)));
  }
  return { top: sortEntries(all), name };
}

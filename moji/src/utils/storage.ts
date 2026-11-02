import type { AppState, Event, Memo, Note, Tag, Todo } from '@/types';
import { toDate, toDayKey } from '@/utils/date';

const STORAGE_KEY = 'moji-app-data';
const STORAGE_VERSION = 1;

/** 生成唯一 ID（优先使用原生 UUID） */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 获取当前时间 ISO 字符串 */
export function nowISO(): string {
  return new Date().toISOString();
}

const initialData: AppState = {
  notes: [
    {
      id: 'welcome-note',
      title: '欢迎使用墨集',
      content:
        '# 墨集\n\n墨色纸韵，一站式日程管理工具。\n\n## 功能特性\n\n- 📝 笔记 — 支持 Markdown 实时预览\n- 💡 备忘 — 灵感速记，可转为待办\n- ✓ 待办 — 优先级与截止日期管理\n- 📅 日程 — 时间块与全天事件\n- 📆 日历 — 月视图与周视图\n\n## 快捷操作\n\n- 顶部搜索框可全局搜索\n- 待办支持按状态/优先级筛选\n- 设置页可导出/导入数据\n\n> 提示：所有数据保存在浏览器本地。',
      tags: ['欢迎'],
      isFavorite: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  memos: [
    {
      id: 'welcome-memo',
      content: '这是一条备忘，灵感一闪即逝，快速记录！',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  todos: [
    {
      id: 'welcome-todo-1',
      title: '体验墨集的功能',
      description: '探索各个模块，感受墨色纸韵的魅力',
      priority: 'high',
      dueDate: toDayKey(new Date()),
      completed: false,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'welcome-todo-2',
      title: '创建第一条笔记',
      priority: 'medium',
      completed: false,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  events: [
    {
      id: 'welcome-event',
      title: '开始使用墨集',
      description: '开启高效的日程管理之旅',
      startDate: new Date().toISOString(),
      isAllDay: true,
      repeat: 'none',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  tags: [
    { id: 'tag-work', name: '工作', color: '#c94043' },
    { id: 'tag-study', name: '学习', color: '#d4a84b' },
    { id: 'tag-life', name: '生活', color: '#5a9e89' },
    { id: 'tag-welcome', name: '欢迎', color: '#8a8a8a' },
  ],
};

interface PersistedPayload {
  version: number;
  /**
   * 写入时间戳（毫秒）。启动时用它比较 localStorage 与桌面数据文件谁更新，
   * 避免「上次关闭时文件没写完」导致旧数据覆盖新数据。旧版本载荷没有该字段（按 0 处理）。
   */
  savedAt?: number;
  data: AppState;
}

/* =========================================================
   条目级归一化工具
   ========================================================= */

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? value : undefined;
}

function asTimestamp(value: unknown, fallback: string): string {
  const text = asString(value);
  if (!text || Number.isNaN(new Date(text).getTime())) return fallback;
  return text;
}

function asPriority(value: unknown): Todo['priority'] {
  return value === 'high' || value === 'low' || value === 'medium' ? value : 'medium';
}

function asRepeat(value: unknown): Event['repeat'] {
  return value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'none'
    ? value
    : 'none';
}

function sanitizeNote(raw: unknown, now: string): Note | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalString(raw.id);
  const title = asOptionalString(raw.title);
  if (!id || !title) return null;
  const createdAt = asTimestamp(raw.createdAt, now);
  return {
    id,
    title,
    content: typeof raw.content === 'string' ? raw.content : '',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag) => typeof tag === 'string') : [],
    isFavorite: raw.isFavorite === true,
    createdAt,
    updatedAt: asTimestamp(raw.updatedAt, createdAt),
  };
}

function sanitizeMemo(raw: unknown, now: string): Memo | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalString(raw.id);
  if (!id) return null;
  return {
    id,
    content: typeof raw.content === 'string' ? raw.content : '',
    createdAt: asTimestamp(raw.createdAt, now),
  };
}

function sanitizeTodo(raw: unknown, now: string): Todo | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalString(raw.id);
  const title = asOptionalString(raw.title);
  if (!id || !title) return null;

  const completed = raw.completed === true;
  const todo: Todo = {
    id,
    title,
    priority: asPriority(raw.priority),
    completed,
    createdAt: asTimestamp(raw.createdAt, now),
  };

  const description = asString(raw.description);
  if (description) todo.description = description;
  const dueDate = asOptionalString(raw.dueDate);
  if (dueDate) todo.dueDate = dueDate;
  const completedAt = asOptionalString(raw.completedAt);
  if (completed && completedAt) todo.completedAt = completedAt;

  return todo;
}

function sanitizeEvent(raw: unknown, now: string): Event | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalString(raw.id);
  const title = asOptionalString(raw.title);
  if (!id || !title) return null;

  // startDate 的合法性在 normalizeState 中统一校验（非法则丢弃并 warn）
  const event: Event = {
    id,
    title,
    startDate: asOptionalString(raw.startDate) ?? '',
    isAllDay: raw.isAllDay === true,
    repeat: asRepeat(raw.repeat),
    createdAt: asTimestamp(raw.createdAt, now),
  };

  const description = asString(raw.description);
  if (description) event.description = description;
  const location = asString(raw.location);
  if (location) event.location = location;
  const endDate = asOptionalString(raw.endDate);
  if (endDate) event.endDate = endDate;

  return event;
}

function sanitizeTag(raw: unknown): Tag | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalString(raw.id);
  const name = asOptionalString(raw.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    color: asOptionalString(raw.color) ?? '#8a8a8a',
  };
}

function sanitizeList<T>(
  raw: unknown[],
  sanitizeOne: (item: unknown) => T | null
): T[] {
  const result: T[] = [];
  for (const item of raw) {
    const sanitized = sanitizeOne(item);
    if (sanitized) result.push(sanitized);
  }
  return result;
}

/**
 * 校验并归一化外部数据，防止脏数据破坏应用。
 *
 * - 仅在 notes / todos 缺失或不是数组时返回 null
 * - 其余集合缺失时补空数组
 * - 条目级校验：丢弃缺少 id（笔记/待办/日程还需 title、标签还需 name）的条目
 * - 补齐默认值：priority=medium、repeat=none、isFavorite=false、tags=[]、completed=false
 * - 不处理日期迁移（见 normalizeState）
 */
export function sanitize(raw: unknown): AppState | null {
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.notes) || !Array.isArray(raw.todos)) return null;

  const now = nowISO();
  return {
    notes: sanitizeList(raw.notes, (item) => sanitizeNote(item, now)),
    memos: Array.isArray(raw.memos) ? sanitizeList(raw.memos, (item) => sanitizeMemo(item, now)) : [],
    todos: sanitizeList(raw.todos, (item) => sanitizeTodo(item, now)),
    events: Array.isArray(raw.events) ? sanitizeList(raw.events, (item) => sanitizeEvent(item, now)) : [],
    tags: Array.isArray(raw.tags) ? sanitizeList(raw.tags, sanitizeTag) : [],
  };
}

/** 迁移旧版 Todo.dueDate（ISO 时间戳 → 本地日键 yyyy-MM-dd） */
function normalizeTodoDueDate(todo: Todo): Todo {
  if (!todo.dueDate) return todo;
  const key = toDayKey(todo.dueDate);
  if (!key) {
    const next = { ...todo };
    delete next.dueDate;
    return next;
  }
  if (key === todo.dueDate) return todo;
  return { ...todo, dueDate: key };
}

/** 校验日程日期：startDate 非法丢弃整条事件；endDate 非法仅移除该字段 */
function normalizeEventDates(event: Event): Event | null {
  const start = toDate(event.startDate);
  if (!start) {
    console.warn(
      `[墨集] 已丢弃开始时间非法的日程：「${event.title}」(${event.id}) startDate=${String(
        event.startDate
      )}`
    );
    return null;
  }

  const next: Event = { ...event, startDate: start.toISOString() };
  if (event.endDate !== undefined) {
    const end = toDate(event.endDate);
    if (!end) {
      console.warn(
        `[墨集] 已移除结束时间非法的日程字段：「${event.title}」(${event.id}) endDate=${String(
          event.endDate
        )}`
      );
      delete next.endDate;
    } else {
      next.endDate = end.toISOString();
    }
  }
  return next;
}

/**
 * 在 sanitize 基础上做数据迁移：
 * - 旧 Todo.dueDate（ISO）→ 本地日键
 * - 丢弃日期非法的日程（console.warn）
 */
export function normalizeState(raw: unknown): AppState | null {
  const safe = sanitize(raw);
  if (!safe) return null;

  const todos: Todo[] = [];
  for (const todo of safe.todos) {
    const normalized = normalizeTodoDueDate(todo);
    todos.push(normalized);
  }

  const events: Event[] = [];
  for (const event of safe.events) {
    const normalized = normalizeEventDates(event);
    if (normalized) events.push(normalized);
  }

  return {
    notes: safe.notes,
    memos: safe.memos,
    todos,
    events,
    tags: safe.tags,
  };
}

/* =========================================================
   读取 / 写入
   ========================================================= */

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveState(initialData);
      return initialData;
    }
    const parsed = JSON.parse(raw);
    // 兼容旧版本直接存储 AppState 的情况
    const data = parsed?.data ? parsed.data : parsed;
    const safe = normalizeState(data);
    return safe ?? initialData;
  } catch {
    return initialData;
  }
}

// 防抖写入：避免连续编辑时频繁 I/O
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingState: AppState | null = null;
const SAVE_DEBOUNCE_MS = 300;

/** 序列化为持久化载荷（localStorage 与桌面数据文件共用同一格式） */
export function serializeState(state: AppState, savedAt: number = Date.now()): string {
  const payload: PersistedPayload = { version: STORAGE_VERSION, savedAt, data: state };
  return JSON.stringify(payload);
}

/** 读取载荷里的写入时间戳；解析失败或旧格式返回 0 */
export function payloadSavedAt(payload: string | null): number {
  if (!payload) return 0;
  try {
    const parsed = JSON.parse(payload);
    const value = Number(parsed?.savedAt);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** 读取 localStorage 里的原始载荷（不解析、不写入） */
export function readLocalPayload(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * 落盘后的回调（桌面壳用它把同一份载荷同步到数据文件；Web 下为 null）。
 * immediate=true 表示这次是「关闭/卸载前的强制落盘」，桌面壳应当用同步写入，避免进程先退出。
 */
export type PersistSink = (payload: string, immediate: boolean) => void;

let persistSink: PersistSink | null = null;
let persistSuppressed = 0;

/** 注册 / 注销落盘回调 */
export function setPersistSink(sink: PersistSink | null): void {
  persistSink = sink;
}

/**
 * 在该函数内发生的落盘只写 localStorage，不回调 persistSink。
 * 用于「应用其他窗口传来的数据」——否则会把刚收到的数据再写回去形成回声。
 */
export function runWithoutPersist<T>(fn: () => T): T {
  persistSuppressed += 1;
  try {
    return fn();
  } finally {
    persistSuppressed -= 1;
  }
}

/**
 * 应用外部（桌面壳）传入的载荷：
 * 写入 localStorage 并返回归一化后的状态，**不触发** persistSink。
 * 载荷非法时返回 null，保持现有数据不变。
 */
export function applyExternalPayload(payload: string | null): AppState | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload);
    // 兼容旧版本直接存储 AppState 的情况
    const data = parsed?.data ? parsed.data : parsed;
    const safe = normalizeState(data);
    if (!safe) return null;
    // 保留原载荷的时间戳：它代表这份数据的「新旧」，重新打时间戳会让比较失去意义
    localStorage.setItem(STORAGE_KEY, serializeState(safe, payloadSavedAt(payload) || Date.now()));
    return safe;
  } catch (error) {
    console.error('[墨集] 应用外部数据失败：', error);
    return null;
  }
}

/** 立即写出挂起状态（若没有挂起状态则什么也不做） */
function writePendingState(immediate = false): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!pendingState) return;

  const state = pendingState;
  pendingState = null;
  try {
    const payload = serializeState(state);
    localStorage.setItem(STORAGE_KEY, payload);
    // 桌面壳：把同一份载荷同步给主进程；Web 下 persistSink 为 null
    if (persistSuppressed === 0) persistSink?.(payload, immediate);
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

/**
 * 保存状态：默认 300ms 防抖写入；immediate=true 时立即写出。
 * 最后一次传入的 state 会作为 pendingState 保留，供 flushState 立即落盘。
 */
export function saveState(state: AppState, immediate = false): void {
  pendingState = state;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (immediate) {
    writePendingState(true);
    return;
  }
  saveTimer = setTimeout(() => writePendingState(false), SAVE_DEBOUNCE_MS);
}

/**
 * 立即刷新挂起的写入（用于页面卸载 / 窗口关闭前）。
 * 走同步路径：桌面壳会在这时用同步 IPC 写文件，保证进程退出前数据已经落盘。
 */
export function flushState(): void {
  writePendingState(true);
}

/** 导入外部 JSON 数据，返回是否成功 */
export function importState(jsonText: string): { ok: true; data: AppState } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText);
    const candidate = parsed?.data ? parsed.data : parsed;
    const safe = normalizeState(candidate);
    if (!safe) {
      return { ok: false, error: '数据格式不正确，缺少必要的 notes 或 todos 字段' };
    }
    saveState(safe, true);
    return { ok: true, data: safe };
  } catch (e) {
    return { ok: false, error: `JSON 解析失败：${e instanceof Error ? e.message : '未知错误'}` };
  }
}

/** 清空所有数据并重置为初始状态 */
export function resetState(): AppState {
  saveState(initialData, true);
  return initialData;
}


import { AppState } from '@/types';

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
      dueDate: new Date().toISOString(),
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
  data: AppState;
}

/** 校验并归一化外部数据，防止脏数据破坏应用 */
export function sanitize(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<AppState>;
  if (!Array.isArray(obj.notes) || !Array.isArray(obj.todos)) return null;
  return {
    notes: obj.notes ?? [],
    memos: obj.memos ?? [],
    todos: obj.todos ?? [],
    events: obj.events ?? [],
    tags: obj.tags ?? [],
  };
}

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
    const safe = sanitize(data);
    return safe ?? initialData;
  } catch {
    return initialData;
  }
}

// 防抖写入：避免连续编辑时频繁 I/O
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 300;

export function saveState(state: AppState, immediate = false): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const execute = () => {
    try {
      const payload: PersistedPayload = { version: STORAGE_VERSION, data: state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  };
  if (immediate) {
    execute();
    return;
  }
  saveTimer = setTimeout(execute, SAVE_DEBOUNCE_MS);
}

/** 立即刷新挂起的写入（用于页面卸载前） */
export function flushState(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    // 注意：此处无法拿到最新 state，依赖调用方先 saveState(immediate)
  }
}

/** 导入外部 JSON 数据，返回是否成功 */
export function importState(jsonText: string): { ok: true; data: AppState } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText);
    const candidate = parsed?.data ? parsed.data : parsed;
    const safe = sanitize(candidate);
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

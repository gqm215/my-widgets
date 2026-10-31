import type { AppState } from '@/types';

export type SearchResultType = 'note' | 'memo' | 'todo' | 'event';

export type SearchMatchedField = 'title' | 'content' | 'description' | 'location';

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  title: string;
  snippet: string;
  route: string;
  matchedField: SearchMatchedField;
}

/** 结果分组顺序：笔记 → 备忘 → 待办 → 日程 */
const TYPE_ORDER: Record<SearchResultType, number> = {
  note: 0,
  memo: 1,
  todo: 2,
  event: 3,
};

const MAX_TITLE_LENGTH = 50;
const MAX_SNIPPET_LENGTH = 80;
const SNIPPET_PADDING = 30;

/** 去掉 Markdown 语法字符，便于结果摘要展示 */
function cleanSnippet(text: string): string {
  return text.replace(/[\n#*`>]/g, ' ').trim();
}

/** 截取命中位置附近的摘要（index ± 30 字符） */
function snippetAround(text: string, lowerText: string, lowerQuery: string): string {
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return cleanSnippet(text.slice(0, MAX_SNIPPET_LENGTH));
  const start = Math.max(0, index - SNIPPET_PADDING);
  const end = Math.min(text.length, index + lowerQuery.length + SNIPPET_PADDING);
  return cleanSnippet(text.slice(start, end));
}

/** 仅标题命中时，摘要取正文前 80 字 */
function leadingSnippet(text: string): string {
  return cleanSnippet(text.slice(0, MAX_SNIPPET_LENGTH));
}

function includesQuery(text: string | undefined | null, lowerQuery: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(lowerQuery);
}

/**
 * 全局搜索笔记 / 备忘 / 待办 / 日程。
 *
 * - 大小写不敏感，空白 query 返回 []
 * - 标题命中优先，其次按 note → memo → todo → event，组内保持原数组顺序
 * - limit 在排序之后截断
 */
export function searchAll(
  state: Pick<AppState, 'notes' | 'memos' | 'todos' | 'events'>,
  query: string,
  limit = 50
): SearchResultItem[] {
  const keyword = (query ?? '').trim();
  if (!keyword) return [];
  const lowerQuery = keyword.toLowerCase();

  const results: Array<SearchResultItem & { titleMatched: boolean }> = [];

  // 笔记：标题或正文
  for (const note of state.notes ?? []) {
    const titleMatched = includesQuery(note.title, lowerQuery);
    const contentMatched = includesQuery(note.content, lowerQuery);
    if (!titleMatched && !contentMatched) continue;

    const matchedField: SearchMatchedField = titleMatched ? 'title' : 'content';
    const snippet = contentMatched
      ? snippetAround(note.content, note.content.toLowerCase(), lowerQuery)
      : leadingSnippet(note.content);

    results.push({
      type: 'note',
      id: note.id,
      title: note.title,
      snippet,
      route: `/notes/${note.id}`,
      matchedField,
      titleMatched,
    });
  }

  // 备忘：只匹配内容
  for (const memo of state.memos ?? []) {
    if (!includesQuery(memo.content, lowerQuery)) continue;

    results.push({
      type: 'memo',
      id: memo.id,
      title:
        memo.content.length > MAX_TITLE_LENGTH
          ? `${memo.content.slice(0, MAX_TITLE_LENGTH)}...`
          : memo.content,
      snippet: snippetAround(memo.content, memo.content.toLowerCase(), lowerQuery),
      route: '/memos',
      matchedField: 'content',
      titleMatched: false,
    });
  }

  // 待办：标题或描述
  for (const todo of state.todos ?? []) {
    const titleMatched = includesQuery(todo.title, lowerQuery);
    const descriptionMatched = includesQuery(todo.description, lowerQuery);
    if (!titleMatched && !descriptionMatched) continue;

    results.push({
      type: 'todo',
      id: todo.id,
      title: todo.title,
      snippet: todo.description || '',
      route: '/todos',
      matchedField: titleMatched ? 'title' : 'description',
      titleMatched,
    });
  }

  // 日程：标题、描述或地点
  for (const event of state.events ?? []) {
    const titleMatched = includesQuery(event.title, lowerQuery);
    const descriptionMatched = includesQuery(event.description, lowerQuery);
    const locationMatched = includesQuery(event.location, lowerQuery);
    if (!titleMatched && !descriptionMatched && !locationMatched) continue;

    const matchedField: SearchMatchedField = titleMatched
      ? 'title'
      : descriptionMatched
        ? 'description'
        : 'location';

    results.push({
      type: 'event',
      id: event.id,
      title: event.title,
      snippet: event.description || event.location || '',
      route: '/events',
      matchedField,
      titleMatched,
    });
  }

  // 标题命中优先；同组内保持原数组顺序（sort 稳定）
  results.sort((a, b) => {
    if (a.titleMatched !== b.titleMatched) return a.titleMatched ? -1 : 1;
    return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
  });

  const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 50;
  return results.slice(0, max).map(
    (item): SearchResultItem => ({
      type: item.type,
      id: item.id,
      title: item.title,
      snippet: item.snippet,
      route: item.route,
      matchedField: item.matchedField,
    })
  );
}

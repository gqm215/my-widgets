import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Search, FileText, Lightbulb, CheckSquare, Clock, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store';
import { searchAll, type SearchResultItem } from '@/utils/search';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui';

type ResultType = SearchResultItem['type'];

const TYPE_ORDER: ResultType[] = ['note', 'memo', 'todo', 'event'];

const typeConfig: Record<ResultType, { label: string; icon: React.ElementType; color: string }> = {
  note: { label: '笔记', icon: FileText, color: 'text-vermilion' },
  memo: { label: '备忘', icon: Lightbulb, color: 'text-rattan' },
  todo: { label: '待办', icon: CheckSquare, color: 'text-success' },
  event: { label: '日程', icon: Clock, color: 'text-ink-500 dark:text-ink-300' },
};

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-rattan/30 dark:bg-rattan/20 text-ink-900 dark:text-ink-100 rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const notes = useAppStore((s) => s.notes);
  const memos = useAppStore((s) => s.memos);
  const todos = useAppStore((s) => s.todos);
  const events = useAppStore((s) => s.events);

  // 输入框受控，并跟随 URL 的 q 变化（回车更新 URL 后回填）
  const [inputValue, setInputValue] = useState(query);
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const results = useMemo((): SearchResultItem[] => {
    if (!query.trim()) return [];
    return searchAll({ notes, memos, todos, events }, query, 100);
  }, [query, notes, memos, todos, events]);

  const grouped = useMemo(() => {
    const groups: Record<ResultType, SearchResultItem[]> = {
      note: [],
      memo: [],
      todo: [],
      event: [],
    };
    for (const item of results) {
      groups[item.type].push(item);
    }
    return groups;
  }, [results]);

  const handleBack = () => navigate(-1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="h-full flex flex-col bg-paper dark:bg-ink-900">
      {/* 头部 */}
      <div className="px-4 md:px-8 py-4 border-b border-paper-dark dark:border-ink-700 flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回"
          className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-500 dark:text-ink-300 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <form onSubmit={handleSubmit} className="relative flex-1 max-w-lg">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300"
            strokeWidth={1.5}
          />
          <input
            type="text"
            role="searchbox"
            aria-label="搜索笔记、备忘、待办、日程"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="搜索笔记、备忘、待办、日程..."
            className="w-full pl-10 pr-4 py-2 bg-paper-dark dark:bg-ink-700 border border-paper-dark dark:border-ink-700 rounded-md text-ink-700 dark:text-ink-100 placeholder-ink-400 dark:placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
          />
        </form>

        {query && (
          <span className="text-sm text-ink-400 dark:text-ink-300 flex-shrink-0">
            共 {results.length} 条结果
          </span>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {!query.trim() ? (
          <EmptyState
            icon={<Search className="w-12 h-12 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
            title="输入关键词开始搜索"
            description="可搜索笔记、备忘、待办、日程的标题和内容"
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<Search className="w-12 h-12 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
            title={`未找到与「${query}」相关的结果`}
            description="尝试更换关键词或检查拼写"
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-8">
            {TYPE_ORDER.map((type) => {
              const items = grouped[type];
              if (items.length === 0) return null;
              const config = typeConfig[type];
              const Icon = config.icon;

              return (
                <section key={type} data-group={type}>
                  <h2 className="text-sm font-medium text-ink-400 dark:text-ink-300 mb-3 flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', config.color)} strokeWidth={1.5} />
                    {config.label}
                    <span className="text-ink-300">({items.length})</span>
                  </h2>

                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <button
                        key={`${type}-${item.id}`}
                        type="button"
                        onClick={() => navigate(item.route)}
                        className={cn(
                          'w-full text-left bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-4 md:p-5',
                          'hover:shadow-paper-lg dark:hover:shadow-none transition-all duration-200',
                          'border border-transparent hover:border-paper-dark dark:hover:border-ink-700',
                          'animate-fade-in',
                        )}
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <h3 className="font-medium text-ink-900 dark:text-ink-100 mb-1.5 line-clamp-1">
                          {highlightMatch(item.title, query)}
                        </h3>
                        {item.snippet && (
                          <p className="text-sm text-ink-400 dark:text-ink-300 line-clamp-2">
                            {highlightMatch(item.snippet, query)}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              type === 'note' && 'bg-vermilion/10 text-vermilion dark:bg-vermilion/20',
                              type === 'memo' && 'bg-rattan/10 text-rattan dark:bg-rattan/20',
                              type === 'todo' && 'bg-success/10 text-success dark:bg-success/20',
                              type === 'event' && 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
                            )}
                          >
                            {config.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

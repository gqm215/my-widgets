import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Search, FileText, Lightbulb, CheckSquare, Clock, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui';

type ResultType = 'note' | 'memo' | 'todo' | 'event';

interface SearchResultItem {
  type: ResultType;
  id: string;
  title: string;
  snippet: string;
  route: string;
}

const typeConfig: Record<ResultType, { label: string; icon: React.ElementType; color: string }> = {
  note: { label: '笔记', icon: FileText, color: 'text-vermilion' },
  memo: { label: '备忘', icon: Lightbulb, color: 'text-rattan' },
  todo: { label: '待办', icon: CheckSquare, color: 'text-success' },
  event: { label: '日程', icon: Clock, color: 'text-ink-500 dark:text-ink-300' },
};

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
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

  const results = useMemo((): SearchResultItem[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const items: SearchResultItem[] = [];

    // Notes
    for (const note of notes) {
      const titleMatch = note.title.toLowerCase().includes(q);
      const contentMatch = note.content.toLowerCase().includes(q);
      if (titleMatch || contentMatch) {
        const idx = note.content.toLowerCase().indexOf(q);
        const snippet =
          idx >= 0
            ? note.content.substring(Math.max(0, idx - 30), idx + q.length + 30)
            : note.content.substring(0, 80);
        items.push({
          type: 'note',
          id: note.id,
          title: note.title,
          snippet: snippet.replace(/[#*`>\n]/g, ' '),
          route: `/notes/${note.id}`,
        });
      }
    }

    // Memos
    for (const memo of memos) {
      if (memo.content.toLowerCase().includes(q)) {
        const idx = memo.content.toLowerCase().indexOf(q);
        const snippet = memo.content.substring(Math.max(0, idx - 30), idx + q.length + 30);
        items.push({
          type: 'memo',
          id: memo.id,
          title: memo.content.length > 50 ? memo.content.substring(0, 50) + '...' : memo.content,
          snippet: snippet.replace(/\n/g, ' '),
          route: '/memos',
        });
      }
    }

    // Todos
    for (const todo of todos) {
      const titleMatch = todo.title.toLowerCase().includes(q);
      const descMatch = todo.description?.toLowerCase().includes(q);
      if (titleMatch || descMatch) {
        items.push({
          type: 'todo',
          id: todo.id,
          title: todo.title,
          snippet: todo.description || '',
          route: '/todos',
        });
      }
    }

    // Events
    for (const event of events) {
      const titleMatch = event.title.toLowerCase().includes(q);
      const descMatch = event.description?.toLowerCase().includes(q);
      const locMatch = event.location?.toLowerCase().includes(q);
      if (titleMatch || descMatch || locMatch) {
        items.push({
          type: 'event',
          id: event.id,
          title: event.title,
          snippet: event.description || event.location || '',
          route: '/events',
        });
      }
    }

    return items;
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

  return (
    <div className="h-full flex flex-col bg-paper dark:bg-ink-900">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 border-b border-paper-dark dark:border-ink-700 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-500 dark:text-ink-300 flex-shrink-0"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <div className="relative flex-1 max-w-lg">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300"
            strokeWidth={1.5}
          />
          <input
            type="text"
            defaultValue={query}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const q = (e.target as HTMLInputElement).value.trim();
                if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
              }
            }}
            placeholder="搜索笔记、备忘、待办、日程..."
            className="w-full pl-10 pr-4 py-2 bg-paper-dark dark:bg-ink-700 border border-paper-dark dark:border-ink-700 rounded-md text-ink-700 dark:text-ink-100 placeholder-ink-400 dark:placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
          />
        </div>

        {query && (
          <span className="text-sm text-ink-400 dark:text-ink-300 flex-shrink-0">
            共 {results.length} 条结果
          </span>
        )}
      </div>

      {/* Content */}
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
            {(Object.entries(grouped) as [ResultType, SearchResultItem[]][]).map(([type, items]) => {
              if (items.length === 0) return null;
              const config = typeConfig[type];
              const Icon = config.icon;

              return (
                <section key={type}>
                  <h2 className="text-sm font-medium text-ink-400 dark:text-ink-300 mb-3 flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', config.color)} strokeWidth={1.5} />
                    {config.label}
                    <span className="text-ink-300 dark:text-ink-500">({items.length})</span>
                  </h2>

                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <button
                        key={`${type}-${item.id}`}
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
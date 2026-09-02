import { Search, Plus } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onAddClick?: () => void;
}

interface SearchResult {
  type: 'note' | 'memo' | 'todo' | 'event';
  id: string;
  label: string;
  match: string;
  route: string;
}

export default function Topbar({ onAddClick }: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const notes = useAppStore((s) => s.notes);
  const memos = useAppStore((s) => s.memos);
  const todos = useAppStore((s) => s.todos);
  const events = useAppStore((s) => s.events);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search notes
    for (const note of notes) {
      if (note.title.toLowerCase().includes(q)) {
        results.push({ type: 'note', id: note.id, label: note.title, match: '标题', route: `/notes/${note.id}` });
      } else if (note.content.toLowerCase().includes(q)) {
        const idx = note.content.toLowerCase().indexOf(q);
        const matchText = note.content.substring(Math.max(0, idx - 20), idx + q.length + 20);
        results.push({ type: 'note', id: note.id, label: `${note.title} ...${matchText}...`, match: '内容', route: `/notes/${note.id}` });
      }
    }

    // Search memos
    for (const memo of memos) {
      if (memo.content.toLowerCase().includes(q)) {
        const idx = memo.content.toLowerCase().indexOf(q);
        const matchText = memo.content.substring(Math.max(0, idx - 20), idx + q.length + 20);
        results.push({
          type: 'memo',
          id: memo.id,
          label: memo.content.length > 60 ? memo.content.substring(0, 60) + '...' : memo.content,
          match: matchText.length > 60 ? '...' + matchText.substring(0, 60) + '...' : matchText,
          route: '/memos',
        });
      }
    }

    // Search todos
    for (const todo of todos) {
      if (todo.title.toLowerCase().includes(q)) {
        results.push({ type: 'todo', id: todo.id, label: todo.title, match: '标题', route: '/todos' });
      } else if (todo.description?.toLowerCase().includes(q)) {
        results.push({ type: 'todo', id: todo.id, label: todo.title, match: '描述', route: '/todos' });
      }
    }

    // Search events
    for (const event of events) {
      if (event.title.toLowerCase().includes(q)) {
        results.push({ type: 'event', id: event.id, label: event.title, match: '标题', route: '/events' });
      } else if (event.description?.toLowerCase().includes(q)) {
        results.push({ type: 'event', id: event.id, label: event.title, match: '描述', route: '/events' });
      }
    }

    return results;
  }, [searchQuery, notes, memos, todos, events]);

  const grouped = useMemo(() => {
    return {
      note: searchResults.filter((r) => r.type === 'note'),
      memo: searchResults.filter((r) => r.type === 'memo'),
      todo: searchResults.filter((r) => r.type === 'todo'),
      event: searchResults.filter((r) => r.type === 'event'),
    };
  }, [searchResults]);

  const groupLabels: Record<string, string> = {
    note: '笔记',
    memo: '备忘',
    todo: '待办',
    event: '日程',
  };

  // Flatten all results for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: SearchResult[] = [];
    for (const key of ['note', 'memo', 'todo', 'event'] as const) {
      flat.push(...grouped[key]);
    }
    return flat;
  }, [grouped]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedIndex(-1);
    setIsDropdownOpen(false);
    inputRef.current?.blur();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSearch();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isDropdownOpen && selectedIndex >= 0 && selectedIndex < flatResults.length) {
          // Navigate to selected dropdown item
          const item = flatResults[selectedIndex];
          navigate(item.route);
          clearSearch();
        } else if (searchQuery.trim()) {
          // Navigate to full search results page
          navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
          clearSearch();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isDropdownOpen && searchQuery.trim()) {
          setIsDropdownOpen(true);
        }
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      }
    },
    [isDropdownOpen, selectedIndex, flatResults, searchQuery, navigate, clearSearch],
  );

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  return (
    <div className="glass border-b border-black/[0.04] dark:border-white/[0.04] px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
      {/* 日期：小屏幕上缩小字号 */}
      <div className="min-w-0">
        <h2 className="text-base md:text-lg font-serif font-semibold text-ink-900 dark:text-ink-100 tracking-wide truncate">
          {formatDate()}
        </h2>
      </div>

      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Search：小屏幕上变窄 */}
        <div className="relative" ref={dropdownRef}>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300 dark:text-ink-400"
            strokeWidth={1.5}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(-1);
              setIsDropdownOpen(e.target.value.trim().length > 0);
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-4 py-2 bg-white/60 dark:bg-ink-800/60 border border-black/[0.06] dark:border-white/[0.06] rounded-lg text-ink-700 dark:text-ink-100 placeholder-ink-400 dark:placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-vermilion/15 focus:border-vermilion/50 focus:bg-white dark:focus:bg-ink-800 w-40 md:w-64 transition-all duration-200 ease-zen"
          />

          {/* Dropdown */}
          {isDropdownOpen && searchQuery.trim() && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-ink-800 rounded-xl shadow-paper-xl dark:shadow-none border border-black/[0.04] dark:border-white/[0.06] max-h-96 overflow-y-auto z-50 animate-scale-in">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-ink-400 dark:text-ink-400 text-sm">无搜索结果</div>
              ) : (
                <>
                  {Object.entries(grouped).map(([type, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <div key={type}>
                        <div className="px-4 py-2 text-xs font-medium tracking-wide text-ink-400 dark:text-ink-400 bg-paper-dark/40 dark:bg-ink-700/40">
                          {groupLabels[type]} ({items.length})
                        </div>
                        {items.map((item) => {
                          const globalIdx = flatResults.indexOf(item);
                          const isHighlighted = globalIdx === selectedIndex;
                          return (
                            <button
                              key={`${type}-${item.id}`}
                              onClick={() => {
                                navigate(item.route);
                                clearSearch();
                              }}
                              className={cn(
                                'w-full text-left px-4 py-3 transition-colors duration-150 border-b border-black/[0.03] dark:border-white/[0.04] last:border-b-0',
                                isHighlighted
                                  ? 'bg-paper-dark dark:bg-ink-700'
                                  : 'hover:bg-paper-dark dark:hover:bg-ink-700',
                              )}
                            >
                              <div className="text-sm font-medium text-ink-900 dark:text-ink-100 line-clamp-1">
                                {item.label}
                              </div>
                              <div className="text-xs text-ink-400 dark:text-ink-400 mt-0.5">
                                匹配: {item.match}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                  <div className="border-t border-black/[0.04] dark:border-white/[0.06] px-4 py-2 text-xs text-ink-400 dark:text-ink-400 text-center">
                    按 <kbd className="px-1.5 py-0.5 bg-paper-dark dark:bg-ink-700 rounded text-ink-500 dark:text-ink-300 font-mono">Enter</kbd> 查看全部结果
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add Button */}
        <button
          onClick={onAddClick}
          className="flex items-center space-x-2 bg-vermilion hover:bg-vermilion-light text-white px-4 py-2 rounded-lg transition-all duration-200 ease-zen font-medium tracking-wide shadow-sm hover:shadow-glow-vermilion active:scale-[0.97]"
        >
          <Plus className="w-5 h-5" strokeWidth={1.5} />
          <span className="hidden sm:inline">新建</span>
        </button>
      </div>
    </div>
  );
}

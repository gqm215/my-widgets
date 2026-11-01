import { Search, Plus, PanelsTopLeft } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { searchAll, type SearchResultItem } from '@/utils/search';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getBridge } from '@/platform/bridge';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onAddClick?: () => void;
}

const GROUP_ORDER: SearchResultItem['type'][] = ['note', 'memo', 'todo', 'event'];

const GROUP_LABELS: Record<SearchResultItem['type'], string> = {
  note: '笔记',
  memo: '备忘',
  todo: '待办',
  event: '日程',
};

const MATCH_LABELS: Record<SearchResultItem['matchedField'], string> = {
  title: '标题',
  content: '内容',
  description: '描述',
  location: '地点',
};

/** 搜索结果下拉：按模块分组 + 键盘上下选择 + Enter 跳转 */
export default function Topbar({ onAddClick }: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  // 桌面壳（Electron / Tauri）下才有桌面小组件；Web / 测试环境为 null，不渲染入口
  const bridge = getBridge();

  const notes = useAppStore((s) => s.notes);
  const memos = useAppStore((s) => s.memos);
  const todos = useAppStore((s) => s.todos);
  const events = useAppStore((s) => s.events);

  // 输入防抖：150ms 后才真正搜索，避免每次按键都全量扫描
  const debouncedQuery = useDebouncedValue(searchQuery, 150);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo((): SearchResultItem[] => {
    if (!debouncedQuery.trim()) return [];
    return searchAll({ notes, memos, todos, events }, debouncedQuery, 30);
  }, [debouncedQuery, notes, memos, todos, events]);

  const grouped = useMemo(() => {
    const groups: Record<SearchResultItem['type'], SearchResultItem[]> = {
      note: [],
      memo: [],
      todo: [],
      event: [],
    };
    for (const result of searchResults) {
      groups[result.type].push(result);
    }
    return groups;
  }, [searchResults]);

  // 键盘导航使用的扁平序列（与分组渲染顺序一致）
  const flatResults = useMemo(() => {
    return GROUP_ORDER.flatMap((type) => grouped[type]);
  }, [grouped]);

  const closeDropdown = useCallback((blur = false) => {
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    if (blur) inputRef.current?.blur();
  }, []);

  const goToResult = useCallback(
    (item: SearchResultItem) => {
      navigate(item.route);
      setSearchQuery('');
      closeDropdown(true);
    },
    [navigate, closeDropdown],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSearchQuery('');
        closeDropdown(true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isDropdownOpen && selectedIndex >= 0 && selectedIndex < flatResults.length) {
          goToResult(flatResults[selectedIndex]);
        } else if (searchQuery.trim()) {
          navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
          setSearchQuery('');
          closeDropdown(true);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isDropdownOpen && searchQuery.trim()) setIsDropdownOpen(true);
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      }
    },
    [isDropdownOpen, selectedIndex, flatResults, searchQuery, navigate, closeDropdown, goToResult],
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

  const noResults = searchResults.length === 0;

  return (
    <div className="glass border-b border-black/[0.04] dark:border-white/[0.04] px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
      {/* 日期：小屏幕上缩小字号 */}
      <div className="min-w-0">
        <h2 className="text-base md:text-lg font-serif font-semibold text-ink-900 dark:text-ink-100 tracking-wide truncate">
          {formatDate()}
        </h2>
      </div>

      <div className="flex items-center space-x-2 md:space-x-3">
        {/* 搜索：防抖 + 分组结果下拉 */}
        <div className="relative" ref={dropdownRef}>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300"
            strokeWidth={1.5}
          />
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-label="全局搜索"
            aria-expanded={isDropdownOpen}
            aria-controls="topbar-search-results"
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

          {isDropdownOpen && searchQuery.trim() && (
            <div
              id="topbar-search-results"
              className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-ink-800 rounded-xl shadow-paper-xl dark:shadow-none border border-black/[0.04] dark:border-white/[0.06] max-h-96 overflow-y-auto z-50 animate-scale-in"
            >
              {noResults ? (
                <div className="p-4 text-center text-ink-400 dark:text-ink-300 text-sm">
                  无搜索结果
                </div>
              ) : (
                <>
                  {GROUP_ORDER.map((type) => {
                    const items = grouped[type];
                    if (items.length === 0) return null;
                    return (
                      <div key={type} data-group={type}>
                        <div className="px-4 py-2 text-xs font-medium tracking-wide text-ink-400 dark:text-ink-300 bg-paper-dark/40 dark:bg-ink-700/40">
                          {GROUP_LABELS[type]} ({items.length})
                        </div>
                        {items.map((item) => {
                          const globalIdx = flatResults.indexOf(item);
                          const isHighlighted = globalIdx === selectedIndex;
                          return (
                            <button
                              key={`${type}-${item.id}`}
                              type="button"
                              onClick={() => goToResult(item)}
                              className={cn(
                                'w-full text-left px-4 py-3 transition-colors duration-150 border-b border-black/[0.03] dark:border-white/[0.04] last:border-b-0',
                                isHighlighted
                                  ? 'bg-paper-dark dark:bg-ink-700'
                                  : 'hover:bg-paper-dark dark:hover:bg-ink-700',
                              )}
                            >
                              <div className="text-sm font-medium text-ink-900 dark:text-ink-100 line-clamp-1">
                                {item.title}
                              </div>
                              <div className="text-xs text-ink-400 dark:text-ink-300 mt-0.5 line-clamp-1">
                                匹配: {MATCH_LABELS[item.matchedField]} · {item.snippet}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                  <div className="border-t border-black/[0.04] dark:border-white/[0.06] px-4 py-2 text-xs text-ink-400 dark:text-ink-300 text-center">
                    按 <kbd className="px-1.5 py-0.5 bg-paper-dark dark:bg-ink-700 rounded text-ink-500 dark:text-ink-300 font-mono">Enter</kbd> 查看全部结果
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 桌面壳：显示 / 隐藏桌面小组件 */}
        {bridge && (
          <button
            type="button"
            onClick={() => bridge.toggleWidget()}
            aria-label="桌面小组件"
            title="显示 / 隐藏桌面小组件"
            className="p-2 rounded-lg text-ink-500 dark:text-ink-300 hover:text-vermilion hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors duration-200 ease-zen"
          >
            <PanelsTopLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
        )}

        {/* 新建：接入全局 QuickCreate */}
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

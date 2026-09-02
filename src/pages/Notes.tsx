import { useAppStore } from '@/store';
import { Plus, Star, Trash2, ArrowLeft, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ConfirmDialog, Textarea, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Note } from '@/types';

/* ========== 虚拟滚动常量 ========== */
const ITEM_HEIGHT = 96;        // 每张笔记卡片高度（含间距）
const SECTION_HEADER_HEIGHT = 28; // "收藏" 分组标题高度
const VIRTUAL_THRESHOLD = 50;    // 超过此数量才启用虚拟滚动
const OVERSCAN = 3;              // 上下额外渲染项数

/* ========== 虚拟列表项类型 ========== */
type FlatItem =
  | { type: 'section' }
  | { type: 'note'; note: Note; globalIndex: number };

/** 构建扁平化列表（含分组标题） */
function buildFlatItems(favorites: Note[], others: Note[]): FlatItem[] {
  const items: FlatItem[] = [];
  if (favorites.length > 0) {
    items.push({ type: 'section' });
    favorites.forEach((note, i) => {
      items.push({ type: 'note', note, globalIndex: i });
    });
  }
  others.forEach((note, i) => {
    items.push({ type: 'note', note, globalIndex: favorites.length + i });
  });
  return items;
}

/** 获取单项高度 */
function getItemHeight(item: FlatItem): number {
  return item.type === 'section' ? SECTION_HEADER_HEIGHT : ITEM_HEIGHT;
}

/** 二分查找：找到第一个 offset >= target 的索引 */
function findIndex(offsets: number[], target: number): number {
  let lo = 0, hi = offsets.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (offsets[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export default function Notes() {
  const { id: urlId } = useParams();
  const notes = useAppStore((state) => state.notes);
  const addNote = useAppStore((state) => state.addNote);
  const deleteNote = useAppStore((state) => state.deleteNote);
  const toggleFavoriteNote = useAppStore((state) => state.toggleFavoriteNote);
  const updateNote = useAppStore((state) => state.updateNote);
  const tags = useAppStore((state) => state.tags);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showEditorOnMobile, setShowEditorOnMobile] = useState(false);

  // ---- 虚拟滚动状态 ----
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const rafRef = useRef(0);

  // Auto-select note from URL param
  useEffect(() => {
    if (urlId) {
      const note = notes.find((n) => n.id === urlId);
      if (note) {
        setSelectedNoteId(note.id);
        setEditingTitle(note.title);
        setEditingContent(note.content);
        setShowEditorOnMobile(true);
      }
    }
  }, [urlId]);  // eslint-disable-line react-hooks/exhaustive-deps

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  const filteredNotes = useMemo(() => {
    if (!filterTag) return notes;
    return notes.filter((n) => n.tags.includes(filterTag));
  }, [notes, filterTag]);

  // 分离收藏/非收藏 并 构建扁平列表
  const { favoriteNotes, otherNotes, flatItems, itemOffsets, totalHeight } = useMemo(() => {
    const fav = filteredNotes.filter((n) => n.isFavorite);
    const other = filteredNotes.filter((n) => !n.isFavorite);
    const items = buildFlatItems(fav, other);
    const offsets: number[] = [];
    let offset = 0;
    for (const item of items) {
      offsets.push(offset);
      offset += getItemHeight(item);
    }
    return { favoriteNotes: fav, otherNotes: other, flatItems: items, itemOffsets: offsets, totalHeight: offset };
  }, [filteredNotes]);

  const enableVirtualScroll = filteredNotes.length > VIRTUAL_THRESHOLD;

  // 监听容器尺寸
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el || !enableVirtualScroll) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    setContainerHeight(el.clientHeight);
    return () => observer.disconnect();
  }, [enableVirtualScroll]);

  // 监听滚动（RAF 节流）
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el || !enableVirtualScroll) return;
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setScrollTop(el.scrollTop);
        rafRef.current = 0;
      });
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enableVirtualScroll]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (!enableVirtualScroll || flatItems.length === 0) return null;
    const start = Math.max(0, findIndex(itemOffsets, scrollTop) - 1);
    const end = findIndex(itemOffsets, scrollTop + containerHeight);
    const clampedStart = Math.max(0, start - OVERSCAN);
    const clampedEnd = Math.min(flatItems.length, end + OVERSCAN);
    return { start: clampedStart, end: clampedEnd, offsetY: itemOffsets[clampedStart] ?? 0 };
  }, [enableVirtualScroll, flatItems, itemOffsets, scrollTop, containerHeight]);

  const handleCreateNote = () => {
    const newId = addNote({ title: '新笔记', content: '', tags: [], isFavorite: false });
    setSelectedNoteId(newId);
    setEditingTitle('新笔记');
    setEditingContent('');
    setShowEditorOnMobile(true);
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setEditingTitle(note.title);
      setEditingContent(note.content);
    }
    setShowEditorOnMobile(true);
  };

  const handleSaveNote = () => {
    if (selectedNoteId) {
      updateNote(selectedNoteId, {
        title: editingTitle,
        content: editingContent,
      });
    }
  };

  const handleBackToList = () => {
    setShowEditorOnMobile(false);
  };

  const tagsInNotes = useMemo(() => {
    const used = new Set(notes.flatMap((n) => n.tags));
    return tags.filter((t) => used.has(t.name));
  }, [notes, tags]);

  /* ---- 渲染笔记列表 ---- */
  const renderNoteList = useCallback(() => {
    if (filteredNotes.length === 0) {
      return (
        <EmptyState
          icon={<FileText className="w-10 h-10 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
          title={filterTag ? `无「${filterTag}」标签的笔记` : '暂无笔记'}
          description={filterTag ? '尝试切换标签或清除筛选。' : '点击右上角 + 创建第一篇笔记，记录你的所思所想。'}
        />
      );
    }

    // 虚拟滚动模式
    if (enableVirtualScroll && visibleRange) {
      const visibleItems = flatItems.slice(visibleRange.start, visibleRange.end);
      return (
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${visibleRange.offsetY}px)` }}>
            {visibleItems.map((item, vi) => {
              if (item.type === 'section') {
                return (
                  <div key="fav-section" style={{ height: SECTION_HEADER_HEIGHT }}>
                    <p className="text-xs text-ink-300 dark:text-ink-300 mb-2 px-1">收藏</p>
                  </div>
                );
              }
              return (
                <NoteItem
                  key={item.note.id}
                  note={item.note}
                  isSelected={selectedNoteId === item.note.id}
                  onSelect={handleSelectNote}
                  onToggleFavorite={toggleFavoriteNote}
                  index={item.globalIndex}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // 常规渲染模式（≤ 50 条）
    return (
      <div className="space-y-3">
        {favoriteNotes.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-ink-300 dark:text-ink-300 mb-2 px-1">收藏</p>
            {favoriteNotes.map((note, idx) => (
              <NoteItem
                key={note.id}
                note={note}
                isSelected={selectedNoteId === note.id}
                onSelect={handleSelectNote}
                onToggleFavorite={toggleFavoriteNote}
                index={idx}
              />
            ))}
          </div>
        )}
        {otherNotes.map((note, idx) => (
          <NoteItem
            key={note.id}
            note={note}
            isSelected={selectedNoteId === note.id}
            onSelect={handleSelectNote}
            onToggleFavorite={toggleFavoriteNote}
            index={favoriteNotes.length + idx}
          />
        ))}
      </div>
    );
  }, [filteredNotes, enableVirtualScroll, visibleRange, flatItems, totalHeight, favoriteNotes, otherNotes, selectedNoteId, filterTag, handleSelectNote, toggleFavoriteNote]);

  return (
    <div className="flex h-full">
      {/* Notes List 侧边栏：移动端全宽，桌面端 w-80 */}
      <div className={cn(
        'border-r border-paper-dark dark:border-ink-700 bg-paper-accent dark:bg-ink-900 flex flex-col flex-shrink-0',
        'w-full md:w-80',
        showEditorOnMobile ? 'hidden md:flex' : 'flex'
      )}>
        <div className="p-4 border-b border-paper-dark dark:border-ink-700 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-ink-900 dark:text-ink-100">笔记</h2>
          <button
            onClick={handleCreateNote}
            className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors"
          >
            <Plus className="w-5 h-5 text-ink-700 dark:text-ink-300" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tag filter */}
        {tagsInNotes.length > 0 && (
          <div className="px-4 py-2 border-b border-paper-dark dark:border-ink-700 flex flex-wrap gap-1">
            <button
              onClick={() => setFilterTag(null)}
              className={cn(
                'text-xs px-2 py-1 rounded-full transition-colors',
                filterTag === null
                  ? 'bg-ink-700 text-white'
                  : 'bg-paper-dark dark:bg-ink-700 text-ink-500 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700'
              )}
            >
              全部
            </button>
            {tagsInNotes.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setFilterTag(tag.name)}
                className={cn(
                  'text-xs px-2 py-1 rounded-full transition-colors',
                  filterTag === tag.name
                    ? 'bg-ink-700 text-white'
                    : 'bg-paper-dark dark:bg-ink-700 text-ink-500 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700'
                )}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        <div ref={listContainerRef} className="flex-1 overflow-y-auto p-4">
          {renderNoteList()}
        </div>
      </div>

      {/* Editor：移动端全宽，桌面端 flex-1 */}
      <div className={cn(
        'flex-1 flex flex-col bg-paper dark:bg-ink-900',
        !showEditorOnMobile ? 'hidden md:flex' : 'flex'
      )}>
        {selectedNote ? (
          <>
            <div className="p-4 border-b border-paper-dark dark:border-ink-700 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {/* 移动端返回按钮 */}
                <button
                  onClick={handleBackToList}
                  className="md:hidden p-1 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-500 dark:text-ink-300"
                >
                  <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSaveNote}
                  className="text-xl font-serif font-semibold text-ink-900 dark:text-ink-100 bg-transparent border-none focus:outline-none w-full"
                  placeholder="标题"
                />
              </div>
              <button
                onClick={() => setDeleteTarget(selectedNote.id)}
                className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-400 dark:text-ink-300 hover:text-vermilion"
              >
                <Trash2 className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* 编辑器 + 预览：移动端上下堆叠，桌面端左右排列 */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              {/* 编辑区域 */}
              <div className="w-full md:w-1/2 flex flex-col p-4 md:border-r border-paper-dark dark:border-ink-700 min-h-0">
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  onBlur={handleSaveNote}
                  className="w-full flex-1 bg-transparent border-none focus:ring-0 focus:border-transparent resize-none"
                  placeholder="开始写作…"
                />
              </div>

              {/* 预览区域 */}
              <div className="w-full md:w-1/2 p-4 overflow-y-auto border-t md:border-t-0 border-paper-dark dark:border-ink-700">
                <div className="markdown-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="text-ink-700 dark:text-ink-100 mb-4">{children}</p>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-ink-700 dark:text-ink-100 text-2xl font-serif font-semibold mb-4 mt-6">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-ink-700 dark:text-ink-100 text-xl font-serif font-semibold mb-3 mt-5">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-ink-700 dark:text-ink-100 text-lg font-serif font-semibold mb-2 mt-4">{children}</h3>
                      ),
                      li: ({ children }) => (
                        <li className="text-ink-700 dark:text-ink-100 mb-1">{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="text-ink-500 dark:text-ink-200 border-l-4 border-ink-300 dark:border-ink-600 pl-4 italic mb-4">{children}</blockquote>
                      ),
                      code: ({ children }) => (
                        <code className="bg-paper-dark dark:bg-ink-700 text-ink-700 dark:text-ink-100 px-1 py-0.5 rounded text-sm">{children}</code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-black text-ink-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
                      ),
                      a: ({ children, href }) => (
                        <a href={href} className="text-rattan dark:text-rattan-light underline" target="_blank" rel="noreferrer">{children}</a>
                      ),
                    }}
                  >
                    {editingContent || '*预览区域*'}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ink-400 dark:text-ink-300">
            <EmptyState
              icon={<FileText className="w-12 h-12 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
              title="选择或创建一条笔记"
              description="在左侧列表中选择笔记，或点击 + 创建新的笔记。"
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteNote(deleteTarget);
            setSelectedNoteId(null);
            setDeleteTarget(null);
          }
        }}
        title="删除笔记"
        message="确定要删除这条笔记吗？此操作不可撤销。"
        confirmLabel="删除"
        variant="danger"
      />
    </div>
  );
}

/* ========== 笔记卡片子组件 ========== */
function NoteItem({
  note,
  isSelected,
  onSelect,
  onToggleFavorite,
  index,
}: {
  note: Note;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  index: number;
}) {
  return (
    <div
      onClick={() => onSelect(note.id)}
      className={cn(
        'p-4 rounded-lg cursor-pointer transition-all duration-200 animate-fade-in',
        isSelected
          ? 'bg-white dark:bg-ink-800 shadow-paper dark:shadow-none'
          : 'bg-white/50 dark:bg-ink-800/50 hover:bg-white dark:hover:bg-ink-800 hover:shadow-paper dark:hover:shadow-none'
      )}
      style={{ animationDelay: `${index * 40}ms`, height: ITEM_HEIGHT - 12 }}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-ink-900 dark:text-ink-100 line-clamp-1 flex-1">{note.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(note.id);
          }}
          className="ml-2 flex-shrink-0"
        >
          <Star
            className={cn(
              'w-4 h-4',
              note.isFavorite ? 'fill-rattan text-rattan' : 'text-ink-300 dark:text-ink-500'
            )}
            strokeWidth={1.5}
          />
        </button>
      </div>
      <p className="text-ink-400 dark:text-ink-300 text-sm mt-1 line-clamp-2">
        {note.content.replace(/[#*`>]/g, '')}
      </p>
    </div>
  );
}
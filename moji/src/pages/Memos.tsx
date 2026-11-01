import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Trash2, CheckSquare, Calendar as CalendarIcon } from 'lucide-react';
import { useAppStore } from '@/store';
import { toDayKey, combineDateTime } from '@/utils/date';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  useToast,
} from '@/components/ui';
import type { Memo } from '@/types';

interface EventDraft {
  memoId: string;
  title: string;
  location: string;
  isAllDay: boolean;
  date: string;
  startTime: string;
  endTime: string;
}

function draftFromMemo(memo: Memo): EventDraft {
  return {
    memoId: memo.id,
    title: memo.content.length > 50 ? `${memo.content.slice(0, 50)}...` : memo.content,
    location: '',
    isAllDay: false,
    date: toDayKey(new Date()),
    startTime: '09:00',
    endTime: '10:00',
  };
}

export default function Memos() {
  const memos = useAppStore((state) => state.memos);
  const addMemo = useAppStore((state) => state.addMemo);
  const deleteMemo = useAppStore((state) => state.deleteMemo);
  const memoToTodo = useAppStore((state) => state.memoToTodo);
  const addEvent = useAppStore((state) => state.addEvent);
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const consumedNewRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [newMemo, setNewMemo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Memo | null>(null);
  const [eventDraft, setEventDraft] = useState<EventDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  // ?new=1：聚焦输入框并清除参数
  useEffect(() => {
    if (searchParams.get('new') !== '1' || consumedNewRef.current) return;
    consumedNewRef.current = true;
    inputRef.current?.focus();
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const sortedMemos = useMemo(
    () => [...memos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [memos],
  );

  const handleAddMemo = () => {
    if (!newMemo.trim()) return;
    addMemo({ content: newMemo.trim() });
    setNewMemo('');
    toast('success', '备忘已记录');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMemo(deleteTarget.id);
    toast('success', '备忘已删除');
    setDeleteTarget(null);
  };

  const handleConvertToTodo = (memo: Memo) => {
    const todoId = memoToTodo(memo.id);
    if (todoId) {
      toast('success', '已转为待办');
    } else {
      toast('error', '转换失败：备忘不存在');
    }
  };

  const handleCreateEvent = () => {
    if (!eventDraft) return;
    if (!eventDraft.title.trim()) {
      setDraftError('请输入日程标题');
      return;
    }
    if (!eventDraft.date) {
      setDraftError('请选择日期');
      return;
    }

    const startDate = eventDraft.isAllDay
      ? combineDateTime(eventDraft.date)
      : combineDateTime(eventDraft.date, eventDraft.startTime);
    const endDate = eventDraft.isAllDay
      ? combineDateTime(eventDraft.date, '23:59')
      : combineDateTime(eventDraft.date, eventDraft.endTime);

    if (!startDate || !endDate) {
      setDraftError('日期或时间格式不正确');
      return;
    }
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setDraftError('结束时间不能早于开始时间');
      return;
    }

    addEvent({
      title: eventDraft.title.trim(),
      location: eventDraft.location.trim() || undefined,
      startDate,
      endDate,
      isAllDay: eventDraft.isAllDay,
      repeat: 'none',
    });
    toast('success', '已转为日程');
    setEventDraft(null);
    setDraftError(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-ink-900 dark:text-ink-100 tracking-wide">
            备忘
          </h2>
          <span className="text-xs md:text-sm text-ink-400 dark:text-ink-400 font-serif tracking-widest">
            忽然而已
          </span>
        </div>
        <div className="brush-divider w-16 mt-3" aria-hidden />
      </div>

      {/* 输入区 */}
      <div className="bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none border border-black/[0.03] dark:border-white/[0.03] p-4 mb-8 transition-all duration-200 ease-zen focus-within:shadow-paper-lg focus-within:border-vermilion/30">
        <textarea
          ref={inputRef}
          value={newMemo}
          onChange={(e) => setNewMemo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddMemo();
            }
          }}
          aria-label="记录备忘"
          placeholder="记录灵感..."
          className="w-full border-none focus:outline-none resize-none text-ink-700 dark:text-ink-200 placeholder:text-ink-300 dark:placeholder:text-ink-500 bg-transparent leading-relaxed"
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <Button type="button" onClick={handleAddMemo} disabled={!newMemo.trim()}>
            添加
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedMemos.length === 0 ? (
          <EmptyState
            scene
            title="暂无备忘"
            description="在此记录灵感与琐思，按下回车即可添加。"
          />
        ) : (
          sortedMemos.map((memo, index) => (
            <div
              key={memo.id}
              data-testid={`memo-${memo.id}`}
              className="memo-item-enter bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none border border-black/[0.03] dark:border-white/[0.03] p-5 md:p-6 lift-on-hover hover:shadow-paper-lg dark:hover:border-white/[0.07]"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <p className="text-ink-700 dark:text-ink-200 whitespace-pre-wrap leading-relaxed">
                {memo.content}
              </p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-ink-400 dark:text-ink-400 font-medium tabular-nums">
                  {format(new Date(memo.createdAt), 'yyyy-MM-dd HH:mm')}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleConvertToTodo(memo)}
                    className="p-2 hover:bg-success/10 dark:hover:bg-success/15 rounded-lg transition-all duration-200 text-success hover:scale-110 active:scale-95"
                    title="转为待办"
                    aria-label="转为待办"
                  >
                    <CheckSquare className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftError(null);
                      setEventDraft(draftFromMemo(memo));
                    }}
                    className="p-2 hover:bg-rattan/10 dark:hover:bg-rattan/15 rounded-lg transition-all duration-200 text-rattan hover:scale-110 active:scale-95"
                    title="转为日程"
                    aria-label="转为日程"
                  >
                    <CalendarIcon className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(memo)}
                    className="p-2 hover:bg-vermilion/10 dark:hover:bg-vermilion/15 rounded-lg transition-all duration-200 text-vermilion hover:scale-110 active:scale-95"
                    title="删除"
                    aria-label="删除"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除备忘"
        message="确定要删除这条备忘吗？此操作不可撤销。"
        confirmLabel="删除"
        variant="danger"
      />

      {/* 转为日程 */}
      <Modal
        open={eventDraft !== null}
        onClose={() => setEventDraft(null)}
        title="转为日程"
      >
        {eventDraft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateEvent();
            }}
          >
            <Input
              label="标题"
              value={eventDraft.title}
              onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })}
              autoFocus
            />
            <Input
              label="日期"
              type="date"
              value={eventDraft.date}
              onChange={(e) => setEventDraft({ ...eventDraft, date: e.target.value })}
            />
            <Input
              label="地点"
              value={eventDraft.location}
              onChange={(e) => setEventDraft({ ...eventDraft, location: e.target.value })}
              placeholder="可选"
            />
            <div className="flex items-center gap-2">
              <input
                id="memo-event-all-day"
                type="checkbox"
                checked={eventDraft.isAllDay}
                onChange={(e) => setEventDraft({ ...eventDraft, isAllDay: e.target.checked })}
                className="w-4 h-4 rounded border-paper-dark dark:border-ink-600 accent-vermilion"
              />
              <label
                htmlFor="memo-event-all-day"
                className="text-sm text-ink-700 dark:text-ink-200 cursor-pointer"
              >
                全天
              </label>
            </div>
            {!eventDraft.isAllDay && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="开始时间"
                  type="time"
                  value={eventDraft.startTime}
                  onChange={(e) => setEventDraft({ ...eventDraft, startTime: e.target.value })}
                />
                <Input
                  label="结束时间"
                  type="time"
                  value={eventDraft.endTime}
                  onChange={(e) => setEventDraft({ ...eventDraft, endTime: e.target.value })}
                />
              </div>
            )}
            {draftError && (
              <p role="alert" className="text-sm text-vermilion">
                {draftError}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEventDraft(null)}>
                取消
              </Button>
              <Button type="submit" variant="primary">
                创建日程
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

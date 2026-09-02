
import { useAppStore } from '@/store';
import { Trash2, CheckSquare, Calendar as CalendarIcon } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { useState } from 'react';
import { ConfirmDialog, Modal, Button, EmptyState } from '@/components/ui';

export default function Memos() {
  const memos = useAppStore(state => state.memos);
  const addMemo = useAppStore(state => state.addMemo);
  const deleteMemo = useAppStore(state => state.deleteMemo);
  const memoToTodo = useAppStore(state => state.memoToTodo);
  const addEvent = useAppStore(state => state.addEvent);
  
  const [newMemo, setNewMemo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);
  
  // 备忘转日程对话框状态
  const [eventTarget, setEventTarget] = useState<{ id: string; content: string } | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventIsAllDay, setEventIsAllDay] = useState(false);
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventStart, setEventStart] = useState('09:00');
  const [eventEnd, setEventEnd] = useState('10:00');
  
  const handleAddMemo = () => {
    if (newMemo.trim()) {
      addMemo({ content: newMemo });
      setNewMemo('');
    }
  };
  
  const handleDelete = () => {
    if (deleteTarget) {
      setExitingId(deleteTarget);
      setTimeout(() => {
        deleteMemo(deleteTarget);
        setDeleteTarget(null);
        setExitingId(null);
      }, 200);
    }
  };

  // 打开备忘转日程对话框
  const openEventModal = (id: string, content: string) => {
    setEventTarget({ id, content });
    setEventTitle(content.substring(0, 50) + (content.length > 50 ? '...' : ''));
    setEventLocation('');
    setEventIsAllDay(false);
    setEventDate(format(new Date(), 'yyyy-MM-dd'));
    setEventStart('09:00');
    setEventEnd('10:00');
  };

  // 确认创建日程
  const handleCreateEvent = () => {
    if (!eventTitle.trim() || !eventTarget) return;
    const dateObj = new Date(eventDate);
    let startDate: Date;
    let endDate: Date | undefined;

    if (eventIsAllDay) {
      startDate = new Date(dateObj);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateObj);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const [startH, startM] = (eventStart || '09:00').split(':').map(Number);
      startDate = setMinutes(setHours(dateObj, startH || 9), startM || 0);
      if (eventEnd) {
        const [endH, endM] = eventEnd.split(':').map(Number);
        endDate = setMinutes(setHours(dateObj, endH || 10), endM || 0);
      }
    }

    addEvent({
      title: eventTitle.trim(),
      location: eventLocation.trim() || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      isAllDay: eventIsAllDay,
      repeat: 'none',
    });
    setEventTarget(null);
  };
  
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* 装饰页头 */}
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

      {/* Input */}
      <div className="bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none border border-black/[0.03] dark:border-white/[0.03] p-4 mb-8 transition-all duration-200 ease-zen focus-within:shadow-paper-lg focus-within:border-vermilion/30">
        <textarea
          value={newMemo}
          onChange={(e) => setNewMemo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddMemo();
            }
          }}
          placeholder="记录灵感..."
          className="w-full border-none focus:outline-none resize-none text-ink-700 dark:text-ink-200 placeholder:text-ink-300 dark:placeholder:text-ink-500 bg-transparent leading-relaxed"
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAddMemo}
            disabled={!newMemo.trim()}
            className="bg-vermilion hover:bg-vermilion-light disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-200 ease-zen font-medium tracking-wide shadow-sm hover:shadow-glow-vermilion active:scale-[0.97] disabled:active:scale-100"
          >
            添加
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {memos.length === 0 ? (
          <EmptyState
            scene
            title="暂无备忘"
            description="在此记录灵感与琐思，按下回车即可添加。"
          />
        ) : (
          memos.map((memo, index) => (
            <div
              key={memo.id}
              className={`memo-item-enter bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none border border-black/[0.03] dark:border-white/[0.03] p-5 md:p-6 lift-on-hover hover:shadow-paper-lg dark:hover:border-white/[0.07]${exitingId === memo.id ? ' memo-item-exit' : ''}`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <p className="text-ink-700 dark:text-ink-200 whitespace-pre-wrap leading-relaxed">{memo.content}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-ink-400 dark:text-ink-400 font-medium tabular-nums">
                  {format(new Date(memo.createdAt), 'yyyy-MM-dd HH:mm')}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => memoToTodo(memo.id)}
                    className="p-2 hover:bg-success/10 dark:hover:bg-success/15 rounded-lg transition-all duration-200 text-success hover:scale-110 active:scale-95"
                    title="转为待办"
                  >
                    <CheckSquare className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => openEventModal(memo.id, memo.content)}
                    className="p-2 hover:bg-rattan/10 dark:hover:bg-rattan/15 rounded-lg transition-all duration-200 text-rattan hover:scale-110 active:scale-95"
                    title="转为日程"
                  >
                    <CalendarIcon className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(memo.id)}
                    className="p-2 hover:bg-vermilion/10 dark:hover:bg-vermilion/15 rounded-lg transition-all duration-200 text-vermilion hover:scale-110 active:scale-95"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除备忘"
        message="确定要删除这条备忘吗？此操作不可撤销。"
        confirmLabel="删除"
        variant="danger"
      />

      {/* 转为日程 Modal */}
      <Modal open={eventTarget !== null} onClose={() => setEventTarget(null)} title="转为日程">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">标题</label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="日程标题"
              className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 placeholder:text-ink-400 dark:placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateEvent(); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">日期</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">地点</label>
            <input
              type="text"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder="可选"
              className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 placeholder:text-ink-400 dark:placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="memoIsAllDay"
              checked={eventIsAllDay}
              onChange={(e) => setEventIsAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-paper-dark dark:border-ink-600 text-vermilion focus:ring-vermilion/50"
            />
            <label htmlFor="memoIsAllDay" className="text-sm text-ink-700 dark:text-ink-200 cursor-pointer">全天</label>
          </div>
          {!eventIsAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">开始时间</label>
                <input
                  type="time"
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">结束时间</label>
                <input
                  type="time"
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setEventTarget(null)}>取消</Button>
            <Button variant="primary" onClick={handleCreateEvent} disabled={!eventTitle.trim()}>创建日程</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


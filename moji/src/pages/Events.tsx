import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, MapPin, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { toDayKey, combineDateTime, formatTime } from '@/utils/date';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Textarea,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Event, RepeatType } from '@/types';

interface EventFormState {
  title: string;
  description: string;
  location: string;
  isAllDay: boolean;
  startDay: string;
  startTime: string;
  endDay: string;
  endTime: string;
  repeat: RepeatType;
}

const REPEAT_LABELS: Record<RepeatType, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
};

const REPEAT_OPTIONS: RepeatType[] = ['none', 'daily', 'weekly', 'monthly'];

function emptyForm(): EventFormState {
  const today = toDayKey(new Date());
  return {
    title: '',
    description: '',
    location: '',
    isAllDay: false,
    startDay: today,
    startTime: '09:00',
    endDay: '',
    endTime: '10:00',
    repeat: 'none',
  };
}

function eventToForm(event: Event): EventFormState {
  return {
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    isAllDay: event.isAllDay,
    startDay: toDayKey(event.startDate),
    startTime: event.isAllDay ? '09:00' : formatTime(event.startDate),
    endDay: event.endDate ? toDayKey(event.endDate) : '',
    endTime: event.endDate && !event.isAllDay ? formatTime(event.endDate) : '10:00',
    repeat: event.repeat,
  };
}

/** 校验表单：返回错误文案，undefined 表示通过 */
function validateEventForm(form: EventFormState): string | undefined {
  if (!form.title.trim()) return '请输入日程标题';
  if (!form.startDay) return '请选择开始日期';
  if (form.isAllDay) {
    if (form.endDay && form.endDay < form.startDay) return '结束日期不能早于开始日期';
    return undefined;
  }
  if (form.endDay) {
    const startISO = combineDateTime(form.startDay, form.startTime);
    const endISO = combineDateTime(form.endDay, form.endTime);
    if (!startISO || !endISO) return '日期或时间格式不正确';
    if (new Date(endISO).getTime() < new Date(startISO).getTime()) {
      return '结束时间不能早于开始时间';
    }
  }
  return undefined;
}

export default function Events() {
  const events = useAppStore((state) => state.events);
  const addEvent = useAppStore((state) => state.addEvent);
  const updateEvent = useAppStore((state) => state.updateEvent);
  const deleteEvent = useAppStore((state) => state.deleteEvent);
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const consumedNewRef = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingId(event.id);
    setForm(eventToForm(event));
    setFormError(null);
    setModalOpen(true);
  };

  // ?new=1：消费一次后清除参数
  useEffect(() => {
    if (searchParams.get('new') !== '1' || consumedNewRef.current) return;
    consumedNewRef.current = true;
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  }, [events]);

  const patchForm = (patch: Partial<EventFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = () => {
    const error = validateEventForm(form);
    if (error) {
      setFormError(error);
      return;
    }

    const startISO = form.isAllDay
      ? combineDateTime(form.startDay)
      : combineDateTime(form.startDay, form.startTime);
    let endISO: string | undefined;
    if (form.isAllDay) {
      if (form.endDay) endISO = combineDateTime(form.endDay, '23:59');
    } else if (form.endDay) {
      endISO = combineDateTime(form.endDay, form.endTime);
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      startDate: startISO,
      endDate: endISO,
      isAllDay: form.isAllDay,
      repeat: form.repeat,
    };

    if (editingId) {
      updateEvent(editingId, payload);
      toast('success', '日程已更新');
    } else {
      addEvent(payload);
      toast('success', '日程已创建');
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteEvent(deleteTarget.id);
    toast('success', '日程已删除');
    setDeleteTarget(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h2 className="text-2xl font-serif font-semibold text-ink-900 dark:text-ink-100">日程</h2>
        <Button onClick={openCreate}>
          <Plus className="w-5 h-5" strokeWidth={1.5} />
          <span>新建</span>
        </Button>
      </div>

      <div className="space-y-4">
        {sortedEvents.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="w-12 h-12 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
            title="暂无日程"
            description="点击右上角「新建」添加日程，让每一天都有序可循。"
            action={
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                <span>新建日程</span>
              </Button>
            }
          />
        ) : (
          sortedEvents.map((event) => (
            <article
              key={event.id}
              data-testid={`event-${event.id}`}
              className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-5 md:p-6 hover:shadow-paper-lg dark:hover:shadow-none transition-shadow duration-200 border-l-4 border-rattan"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-ink-900 dark:text-ink-100">{event.title}</h3>
                    {event.isAllDay && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300">
                        全天
                      </span>
                    )}
                    {event.repeat !== 'none' && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-rattan/10 text-rattan">
                        <Repeat className="w-3 h-3" strokeWidth={1.5} />
                        {REPEAT_LABELS[event.repeat]}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-ink-400 dark:text-ink-300 text-sm mt-1">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="text-ink-400 dark:text-ink-300 text-sm mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {event.location}
                    </p>
                  )}
                  <div className="mt-2 flex items-center text-sm text-ink-500 dark:text-ink-400 gap-2 flex-wrap">
                    <CalendarIcon className="w-4 h-4" strokeWidth={1.5} />
                    <span>
                      {format(new Date(event.startDate), 'yyyy年M月d日 EEEE', { locale: zhCN })}
                      {!event.isAllDay && ` ${formatTime(event.startDate)}`}
                      {event.endDate && (
                        <>
                          {' - '}
                          {format(new Date(event.endDate), 'yyyy年M月d日', { locale: zhCN })}
                          {!event.isAllDay && ` ${formatTime(event.endDate)}`}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(event)}
                    aria-label={`编辑${event.title}`}
                    className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-400 dark:text-ink-300 hover:text-ink-700 dark:hover:text-ink-100"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(event)}
                    aria-label={`删除${event.title}`}
                    className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-400 dark:text-ink-300 hover:text-vermilion dark:hover:text-vermilion-light"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* 新建 / 编辑共用表单 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑日程' : '新建日程'}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Input
            label="标题"
            value={form.title}
            onChange={(e) => patchForm({ title: e.target.value })}
            placeholder="日程标题"
            autoFocus
          />
          <Textarea
            label="描述"
            value={form.description}
            onChange={(e) => patchForm({ description: e.target.value })}
            placeholder="可选"
            rows={2}
          />
          <Input
            label="地点"
            value={form.location}
            onChange={(e) => patchForm({ location: e.target.value })}
            placeholder="可选"
          />

          <div className="flex items-center gap-2">
            <input
              id="event-all-day"
              type="checkbox"
              checked={form.isAllDay}
              onChange={(e) => patchForm({ isAllDay: e.target.checked })}
              className="w-4 h-4 rounded border-paper-dark dark:border-ink-600 accent-vermilion"
            />
            <label
              htmlFor="event-all-day"
              className="text-sm text-ink-700 dark:text-ink-200 cursor-pointer"
            >
              全天
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="开始日期"
              type="date"
              value={form.startDay}
              onChange={(e) => patchForm({ startDay: e.target.value })}
            />
            {!form.isAllDay && (
              <Input
                label="开始时间"
                type="time"
                value={form.startTime}
                onChange={(e) => patchForm({ startTime: e.target.value })}
              />
            )}
            <Input
              label="结束日期（可选）"
              type="date"
              value={form.endDay}
              onChange={(e) => patchForm({ endDay: e.target.value })}
            />
            {!form.isAllDay && (
              <Input
                label="结束时间"
                type="time"
                value={form.endTime}
                onChange={(e) => patchForm({ endTime: e.target.value })}
              />
            )}
          </div>

          <div>
            <label
              htmlFor="event-repeat"
              className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5"
            >
              重复
            </label>
            <select
              id="event-repeat"
              value={form.repeat}
              onChange={(e) => patchForm({ repeat: e.target.value as RepeatType })}
              className={cn(
                'w-full px-3.5 py-2 rounded-md border bg-white dark:bg-ink-800',
                'text-ink-900 dark:text-ink-100 border-paper-dark dark:border-ink-600',
                'focus:outline-none focus:ring-2 focus:ring-vermilion/15 focus:border-vermilion/60',
              )}
            >
              {REPEAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {REPEAT_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-vermilion">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" variant="primary">
              {editingId ? '保存' : '创建'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除日程"
        message={deleteTarget ? `确定要删除日程「${deleteTarget.title}」吗？此操作不可撤销。` : ''}
        confirmLabel="删除"
        variant="danger"
      />
    </div>
  );
}

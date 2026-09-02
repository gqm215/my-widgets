
import { useAppStore } from '@/store';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { EmptyState } from '@/components/ui';

export default function Events() {
  const events = useAppStore(state => state.events);
  const addEvent = useAppStore(state => state.addEvent);
  const deleteEvent = useAppStore(state => state.deleteEvent);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventStartDate, setNewEventStartDate] = useState('');
  const [newEventEndDate, setNewEventEndDate] = useState('');
  const [newEventIsAllDay, setNewEventIsAllDay] = useState(true);
  
  const handleAddEvent = () => {
    if (newEventTitle.trim() && newEventStartDate) {
      addEvent({
        title: newEventTitle,
        description: newEventDesc || undefined,
        location: newEventLocation || undefined,
        startDate: newEventStartDate,
        endDate: newEventEndDate || undefined,
        isAllDay: newEventIsAllDay,
        repeat: 'none',
      });
      setShowAddModal(false);
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventLocation('');
      setNewEventStartDate('');
      setNewEventEndDate('');
    }
  };
  
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif font-semibold text-ink-900 dark:text-ink-100">日程</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-vermilion hover:bg-vermilion-light text-white px-4 py-2 rounded-md transition-colors duration-200"
        >
          <Plus className="w-5 h-5" strokeWidth={1.5} />
          <span>新建</span>
        </button>
      </div>
      
      {/* List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-12 h-12 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
            title="暂无日程"
            description="点击右上角「新建」添加日程，让每一天都有序可循。"
            action={
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-vermilion hover:bg-vermilion-light text-white rounded-md transition-colors duration-200 text-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                <span>新建日程</span>
              </button>
            }
          />
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-6 hover:shadow-paper-lg dark:hover:shadow-none transition-shadow duration-200 border-l-4 border-rattan"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-ink-900 dark:text-ink-100">{event.title}</h3>
                  {event.description && (
                    <p className="text-ink-400 dark:text-ink-300 text-sm mt-1">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="text-ink-400 dark:text-ink-300 text-sm mt-1 flex items-center">
                      <span className="mr-1">📍</span> {event.location}
                    </p>
                  )}
                  <div className="mt-2 flex items-center text-sm text-ink-500 dark:text-ink-400">
                    <Calendar className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    <span>
                      {event.isAllDay ? '全天 ' : ''}
                      {format(new Date(event.startDate), 'yyyy-MM-dd')}
                      {!event.isAllDay && ` ${format(new Date(event.startDate), 'HH:mm')}`}
                      {event.endDate && (
                        <>
                          {' - '}
                          {format(new Date(event.endDate), 'yyyy-MM-dd')}
                          {!event.isAllDay && ` ${format(new Date(event.endDate), 'HH:mm')}`}
                        </>
                      )}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-400 dark:text-ink-300 hover:text-vermilion dark:hover:text-vermilion-light"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper-lg dark:shadow-none p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-semibold text-ink-900 dark:text-ink-100 mb-4">新建日程</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="标题"
                className="w-full border border-paper-dark dark:border-ink-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion/50 bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100"
                autoFocus
              />
              <textarea
                value={newEventDesc}
                onChange={(e) => setNewEventDesc(e.target.value)}
                placeholder="描述"
                className="w-full border border-paper-dark dark:border-ink-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion/50 bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100"
                rows={2}
              />
              <input
                type="text"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                placeholder="地点"
                className="w-full border border-paper-dark dark:border-ink-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion/50 bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100"
              />
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={newEventIsAllDay}
                  onChange={(e) => setNewEventIsAllDay(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="allDay" className="text-sm text-ink-700 dark:text-ink-300">全天</label>
              </div>
              <input
                type={newEventIsAllDay ? 'date' : 'datetime-local'}
                value={newEventStartDate}
                onChange={(e) => setNewEventStartDate(e.target.value)}
                className="w-full border border-paper-dark dark:border-ink-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion/50 bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100"
              />
              <input
                type={newEventIsAllDay ? 'date' : 'datetime-local'}
                value={newEventEndDate}
                onChange={(e) => setNewEventEndDate(e.target.value)}
                placeholder="结束时间 (可选)"
                className="w-full border border-paper-dark dark:border-ink-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion/50 bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100"
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-ink-600 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddEvent}
                  className="px-4 py-2 bg-vermilion hover:bg-vermilion-light text-white rounded-md transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


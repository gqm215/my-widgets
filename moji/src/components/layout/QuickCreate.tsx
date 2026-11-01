import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckSquare, FileText, Lightbulb } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/utils';

/** 快速新建支持的四类模块 */
type QuickCreateModule = 'notes' | 'memos' | 'todos' | 'events';

interface QuickCreateOption {
  module: QuickCreateModule;
  label: string;
  description: string;
  icon: React.ElementType;
  accent: string;
}

const OPTIONS: QuickCreateOption[] = [
  {
    module: 'notes',
    label: '笔记',
    description: '记录一篇 Markdown 笔记',
    icon: FileText,
    accent: 'text-vermilion bg-vermilion/10',
  },
  {
    module: 'memos',
    label: '备忘',
    description: '速记一闪而过的灵感',
    icon: Lightbulb,
    accent: 'text-rattan bg-rattan/10',
  },
  {
    module: 'todos',
    label: '待办',
    description: '添加一条可勾选的事项',
    icon: CheckSquare,
    accent: 'text-success bg-success/10',
  },
  {
    module: 'events',
    label: '日程',
    description: '安排一段有始有终的时间',
    icon: CalendarDays,
    accent: 'text-ink-500 dark:text-ink-300 bg-ink-100 dark:bg-ink-700',
  },
];

export interface QuickCreateProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 全局新建菜单：键盘可达（Modal 内焦点陷阱 + 按钮原生焦点），
 * 选择类型后跳转 `/<module>?new=1`，由目标页面消费并自动打开新建入口。
 */
export function QuickCreate({ open, onClose }: QuickCreateProps) {
  const navigate = useNavigate();

  const handleSelect = (module: QuickCreateModule) => {
    onClose();
    navigate(`/${module}?new=1`);
  };

  return (
    <Modal open={open} onClose={onClose} title="新建">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="选择新建类型">
        {OPTIONS.map((option, index) => {
          const Icon = option.icon;
          return (
            <button
              key={option.module}
              type="button"
              onClick={() => handleSelect(option.module)}
              autoFocus={index === 0}
              aria-label={`新建${option.label}`}
              data-module={option.module}
              className={cn(
                'group flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ease-zen',
                'border border-paper-dark dark:border-ink-600',
                'hover:border-vermilion/40 hover:bg-paper-accent dark:hover:bg-ink-700/60',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40 focus-visible:ring-offset-1'
              )}
            >
              <span className={cn('w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0', option.accent)}>
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink-900 dark:text-ink-100">
                  {option.label}
                </span>
                <span className="block text-xs text-ink-400 dark:text-ink-400 mt-0.5 truncate">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export default QuickCreate;

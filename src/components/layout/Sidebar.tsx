import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Lightbulb, CheckSquare, Calendar, Clock, Settings, Sun, Moon, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useState, useEffect } from 'react';

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: Home, label: '今日' },
  { path: '/notes', icon: FileText, label: '笔记' },
  { path: '/memos', icon: Lightbulb, label: '备忘' },
  { path: '/todos', icon: CheckSquare, label: '待办' },
  { path: '/events', icon: Clock, label: '日程' },
  { path: '/calendar', icon: Calendar, label: '日历' },
  { path: '/report', icon: FileText, label: '周报' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen: externalOpen, onMobileClose: externalOnClose }: SidebarProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);

  // 合并内外状态：外部控制优先
  const isMobileOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const closeMobile = () => {
    setInternalOpen(false);
    externalOnClose?.();
  };

  // 路由变化时在移动端自动关闭侧边栏
  useEffect(() => {
    closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const sidebarContent = (
    <div className="w-64 h-screen bg-ink-900 flex flex-col border-r border-ink-700/60 relative overflow-hidden">
      {/* 顶部装饰：极淡水墨 */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.06] pointer-events-none">
        <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="96" cy="32" r="24" fill="#f6efe2"/>
          <path d="M0,96 Q32,80 64,96 T128,96" stroke="#f6efe2" stroke-width="1.5" fill="none"/>
        </svg>
      </div>

      {/* Logo + 移动端关闭按钮 */}
      <div className="p-6 border-b border-ink-700/60 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br from-paper to-paper-dark/70 flex items-center justify-center shadow-md dark:shadow-none">
            <img src="./favicon.svg" alt="墨集" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-serif text-paper font-bold tracking-wide">墨集</h1>
            <p className="text-ink-400 text-[11px] tracking-widest font-serif">MO·JI</p>
          </div>
        </div>
        <button
          onClick={closeMobile}
          className="md:hidden p-1 hover:bg-ink-700 rounded-md transition-colors text-ink-300"
          aria-label="关闭菜单"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'group relative flex items-center px-4 py-2.5 rounded-md transition-all duration-200',
                isActive
                  ? 'bg-ink-700/80 text-paper'
                  : 'text-ink-300 hover:bg-ink-700/40 hover:text-paper hover:translate-x-0.5'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-vermilion rounded-r-sm" />
              )}
              <Icon
                className={cn(
                  'w-[18px] h-[18px] mr-3 transition-transform duration-200',
                  isActive ? 'text-vermilion' : 'group-hover:scale-110'
                )}
                strokeWidth={1.5}
              />
              <span className="font-medium text-sm tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 底部山水装饰条 */}
      <div className="px-6 py-3 opacity-30 dark:opacity-20 pointer-events-none">
        <svg viewBox="0 0 200 40" className="w-full h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,30 L20,18 L40,28 L60,12 L80,24 L100,15 L120,26 L140,14 L160,24 L180,18 L200,28 L200,40 L0,40 Z"
                fill="#f6efe2" opacity="0.4"/>
          <path d="M0,34 L30,28 L60,32 L90,26 L120,30 L150,24 L180,30 L200,26 L200,40 L0,40 Z"
                fill="#f6efe2" opacity="0.6"/>
        </svg>
      </div>

      {/* Bottom: 主题切换 + 设置 */}
      <div className="p-3 border-t border-ink-700/60 space-y-0.5">
        <button
          onClick={toggleTheme}
          className="group flex items-center w-full px-4 py-2.5 rounded-md text-ink-300 hover:bg-ink-700/40 hover:text-paper hover:translate-x-0.5 transition-all duration-200"
        >
          {theme === 'dark' ? (
            <Sun className="w-[18px] h-[18px] mr-3 group-hover:scale-110 group-hover:text-rattan-light transition-transform duration-200" strokeWidth={1.5} />
          ) : (
            <Moon className="w-[18px] h-[18px] mr-3 group-hover:scale-110 group-hover:text-rattan-light transition-transform duration-200" strokeWidth={1.5} />
          )}
          <span className="font-medium text-sm tracking-wide">{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
        </button>

        <Link
          to="/settings"
          className={cn(
            'group flex items-center px-4 py-2.5 rounded-md transition-all duration-200 relative',
            location.pathname === '/settings'
              ? 'bg-ink-700/80 text-paper'
              : 'text-ink-300 hover:bg-ink-700/40 hover:text-paper hover:translate-x-0.5'
          )}
        >
          {location.pathname === '/settings' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-vermilion rounded-r-sm" />
          )}
          <Settings
            className={cn(
              'w-[18px] h-[18px] mr-3 transition-transform duration-200',
              location.pathname === '/settings' ? 'text-vermilion' : 'group-hover:scale-110'
            )}
            strokeWidth={1.5}
          />
          <span className="font-medium text-sm tracking-wide">设置</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* 移动端汉堡按钮（仅当外部没有控制时显示） */}
      {externalOpen === undefined && (
        <button
          onClick={() => setInternalOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-ink-900 text-paper rounded-md shadow-paper-lg hover:bg-ink-700 transition-colors"
          aria-label="打开菜单"
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </button>
      )}

      {/* 桌面端：始终显示的侧边栏 */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* 移动端侧边栏：fixed 覆盖层 */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* 半透明遮罩 - 覆盖整个屏幕，随侧边栏一起淡入 */}
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={closeMobile}
          />
          {/* 侧边栏内容 */}
          <div className="absolute top-0 right-0 h-full animate-slide-in-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

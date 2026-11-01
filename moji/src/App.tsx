import { BrowserRouter, HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState, type ReactNode, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Plus } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import QuickCreate from "@/components/layout/QuickCreate";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Today = lazy(() => import("@/pages/Today"));
const Notes = lazy(() => import("@/pages/Notes"));
const Memos = lazy(() => import("@/pages/Memos"));
const Todos = lazy(() => import("@/pages/Todos"));
const Events = lazy(() => import("@/pages/Events"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Report = lazy(() => import("@/pages/Report"));
const Settings = lazy(() => import("@/pages/Settings"));
const SearchResults = lazy(() => import("@/pages/SearchResults"));

/** 页面切换过渡包装 */
function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ height: "100%" }}
    >
      {children}
    </motion.div>
  );
}

/** 页面懒加载时的加载动画 — 东方美学风格 */
function PageLoading() {
  return (
    <div className="flex items-center justify-center h-full" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-vermilion/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-vermilion animate-spin" />
        </div>
        <span className="text-xs text-ink-400 dark:text-ink-300 animate-pulse">加载中</span>
      </div>
    </div>
  );
}

/**
 * 应用外壳（不含 Router，便于测试直接挂载）：
 * 侧边栏 + 移动端头部 + 桌面端 Topbar + 路由内容 + 全局新建菜单。
 */
export function AppContent() {
  const location = useLocation();
  const isNotesPage = location.pathname === '/notes' || location.pathname.startsWith('/notes/');
  const isSearchPage = location.pathname === '/search';
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const openQuickCreate = () => setQuickCreateOpen(true);
  const closeQuickCreate = () => setQuickCreateOpen(false);

  return (
    <div className="flex h-screen bg-zen text-ink-700 dark:text-ink-100 overflow-hidden">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 移动端汉堡按钮 + Topbar */}
        <div className="md:hidden flex items-center glass border-b border-paper-dark/60 dark:border-ink-700/60 px-4 py-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-700 dark:text-ink-100"
            aria-label="打开菜单"
          >
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <h1 className="ml-3 text-lg font-serif font-semibold text-ink-900 dark:text-ink-100">墨集</h1>
          <button
            onClick={openQuickCreate}
            className="ml-auto p-2 bg-vermilion hover:bg-vermilion-light text-white rounded-md transition-colors"
            aria-label="新建"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        {/* 桌面端 Topbar */}
        {!isNotesPage && !isSearchPage && (
          <div className="hidden md:block">
            <Topbar onAddClick={openQuickCreate} />
          </div>
        )}
        <main className={`flex-1 overflow-auto ${(isNotesPage || isSearchPage) ? 'bg-zen' : ''}`}>
          <AnimatePresence mode="wait">
            <Suspense fallback={<PageLoading />}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageTransition><Today /></PageTransition>} />
                <Route path="/notes" element={<PageTransition><Notes /></PageTransition>} />
                <Route path="/notes/:id" element={<PageTransition><Notes /></PageTransition>} />
                <Route path="/memos" element={<PageTransition><Memos /></PageTransition>} />
                <Route path="/todos" element={<PageTransition><Todos /></PageTransition>} />
                <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
                <Route path="/calendar" element={<PageTransition><Calendar /></PageTransition>} />
                <Route path="/report" element={<PageTransition><Report /></PageTransition>} />
                <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
                <Route path="/search" element={<PageTransition><SearchResults /></PageTransition>} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </main>
      </div>

      {/* 全局新建菜单：桌面 Topbar 与移动端头部共用 */}
      <QuickCreate open={quickCreateOpen} onClose={closeQuickCreate} />
    </div>
  );
}

/**
 * 打包后的 Electron 用 file:// 加载页面，History API 在这个 origin 下不可用，
 * 因此 file:// 下切到 HashRouter；Tauri（http://tauri.localhost）与浏览器继续用 BrowserRouter。
 */
const AppRouter =
  typeof window !== 'undefined' && window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <ErrorBoundary>
      <AppRouter>
        <AppContent />
      </AppRouter>
    </ErrorBoundary>
  );
}

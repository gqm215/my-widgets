import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@/hooks/useTheme';
import { ToastProvider } from '@/components/ui/Toast';
import { useAppStore } from '@/store';
import { flushState } from '@/utils/storage';
import type { AppState } from '@/types';
import { emptyState } from './fixtures';

export { setMediaQuery, resetMediaQueries } from './setup';
export {
  emptyState,
  makeEvent,
  makeMemo,
  makeNote,
  makeTag,
  makeTodo,
  seedState,
} from './fixtures';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** 初始路由，例如 '/notes/note-1'，默认 '/' */
  route?: string;
}

/**
 * 带齐应用级 Provider 的渲染 helper：
 * MemoryRouter → ThemeProvider → ToastProvider → 被测组件
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...options }: RenderWithProvidersOptions = {}
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    ),
    ...options,
  });
}

/** 清空 store 中的业务数据（保留 action），并取消挂起的防抖写入 */
export function resetStore(): void {
  try {
    flushState();
  } catch {
    // 清理阶段忽略存储异常
  }
  useAppStore.setState(emptyState());
}

/** 重置 store 后写入指定的数据分片，便于页面测试播种 */
export function seedStore(partial: Partial<AppState> = {}): void {
  resetStore();
  useAppStore.setState(partial);
}

/** 等待一轮宏任务（用于等待异步副作用落地） */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/Toast';
import { useToast } from '@/components/ui';

function Trigger({ type = 'success', message = '保存成功' }: { type?: 'success' | 'error' | 'warning' | 'info'; message?: string }) {
  const { toast } = useToast();
  return <button onClick={() => toast(type, message)}>触发</button>;
}

function renderWithToast(props: React.ComponentProps<typeof Trigger> = {}) {
  return render(
    <ToastProvider>
      <Trigger {...props} />
    </ToastProvider>
  );
}

describe('Toast', () => {
  it('初始不渲染任何 toast', () => {
    renderWithToast();
    expect(screen.queryByTestId('toast-item')).not.toBeInTheDocument();
  });

  it('toast() 后渲染消息', () => {
    renderWithToast();
    fireEvent.click(screen.getByRole('button', { name: '触发' }));
    expect(screen.getByText('保存成功')).toBeInTheDocument();
    expect(screen.getByTestId('toast-item')).toBeInTheDocument();
  });

  it.each([
    ['success', 'bg-success'],
    ['error', 'bg-vermilion'],
    ['warning', 'bg-rattan'],
    ['info', 'bg-ink-700'],
  ] as const)('%s 类型使用对应配色', (type, expectedClass) => {
    renderWithToast({ type, message: `${type} 消息` });
    fireEvent.click(screen.getByRole('button', { name: '触发' }));
    expect(screen.getByTestId('toast-item').className).toContain(expectedClass);
    expect(screen.getByText(`${type} 消息`)).toBeInTheDocument();
  });

  it('可以同时显示多条 toast', () => {
    renderWithToast();
    fireEvent.click(screen.getByRole('button', { name: '触发' }));
    fireEvent.click(screen.getByRole('button', { name: '触发' }));
    expect(screen.getAllByTestId('toast-item')).toHaveLength(2);
  });

  it('同屏最多 3 条，超出丢弃最旧', () => {
    renderWithToast();
    const trigger = screen.getByRole('button', { name: '触发' });
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(trigger);
    }
    expect(screen.getAllByTestId('toast-item')).toHaveLength(3);
  });

  it('点击关闭按钮立即移除 toast', () => {
    renderWithToast();
    fireEvent.click(screen.getByRole('button', { name: '触发' }));
    expect(screen.getByText('保存成功')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(screen.queryByText('保存成功')).not.toBeInTheDocument();
  });

  it('3 秒后自动消失', () => {
    vi.useFakeTimers();
    renderWithToast();
    fireEvent.click(screen.getByRole('button', { name: '触发' }));
    expect(screen.getByText('保存成功')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.getByText('保存成功')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('保存成功')).not.toBeInTheDocument();
  });

  it('在 ToastProvider 外部使用 useToast 会抛错', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow('useToast must be used within a ToastProvider');
    consoleError.mockRestore();
  });
});

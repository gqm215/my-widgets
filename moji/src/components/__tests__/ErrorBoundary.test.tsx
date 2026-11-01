import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function Boom(): null {
  throw new Error('boom');
}

beforeEach(() => {
  // React 会把边界捕获的错误打印到 console.error，测试里静音
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('正常渲染 children', () => {
    render(
      <ErrorBoundary>
        <p>正常内容</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('正常内容')).toBeInTheDocument();
  });

  it('子组件抛错时渲染默认兜底界面', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('heading', { name: '墨染残卷' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('支持自定义 fallback', () => {
    render(
      <ErrorBoundary fallback={<p>自定义兜底</p>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('自定义兜底')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '墨染残卷' })).not.toBeInTheDocument();
  });

  it('点击重试后重新渲染 children', async () => {
    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error('boom');
      return <p>恢复正常</p>;
    }

    render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('heading', { name: '墨染残卷' })).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(screen.getByText('恢复正常')).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('渲染标题与描述', () => {
    render(<EmptyState title="暂无笔记" description="写下第一条笔记吧" />);
    expect(screen.getByRole('heading', { name: '暂无笔记' })).toBeInTheDocument();
    expect(screen.getByText('写下第一条笔记吧')).toBeInTheDocument();
  });

  it('默认渲染水墨圆形插画', () => {
    const { container } = render(<EmptyState title="空" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('传入 icon 时渲染自定义图标', () => {
    render(<EmptyState title="空" icon={<span data-testid="custom-icon">i</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('scene 模式渲染空山场景图', () => {
    const { container } = render(<EmptyState title="空" scene />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', './scenes/empty-mountain.svg');
  });

  it('渲染操作按钮', () => {
    render(<EmptyState title="空" action={<button>新建</button>} />);
    expect(screen.getByRole('button', { name: '新建' })).toBeInTheDocument();
  });

  it('无描述与操作时不渲染多余文本', () => {
    render(<EmptyState title="空" />);
    expect(screen.getByRole('heading', { name: '空' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('合并自定义 className', () => {
    const { container } = render(<EmptyState title="空" className="custom-empty" />);
    expect(container.firstElementChild?.className).toContain('custom-empty');
  });
});

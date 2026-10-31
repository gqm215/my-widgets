import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('渲染 children', () => {
    render(
      <Card>
        <p>卡片内容</p>
      </Card>
    );
    expect(screen.getByText('卡片内容')).toBeInTheDocument();
  });

  it('渲染标题', () => {
    render(<Card title="今日概览">内容</Card>);
    expect(screen.getByRole('heading', { name: '今日概览' })).toBeInTheDocument();
  });

  it('hoverable 时应用抬升样式', () => {
    const { container } = render(<Card hoverable>悬停卡片</Card>);
    expect(container.firstElementChild?.className).toContain('lift-on-hover');
  });

  it('默认不应用 hoverable 样式', () => {
    const { container } = render(<Card>普通卡片</Card>);
    expect(container.firstElementChild?.className).not.toContain('lift-on-hover');
  });

  it('padded=false 时移除内边距', () => {
    const { container } = render(<Card padded={false}>无内边距</Card>);
    expect(container.firstElementChild?.className).not.toContain('p-6');
  });

  it('accent 渲染装饰条', () => {
    const { container } = render(<Card accent="vermilion">强调</Card>);
    const accentBar = container.querySelector('span');
    expect(accentBar?.className).toContain('text-vermilion');
  });

  it('accent 为 none 时不渲染装饰条', () => {
    const { container } = render(<Card>无强调</Card>);
    expect(container.querySelector('span')).toBeNull();
  });

  it('合并自定义 className', () => {
    const { container } = render(<Card className="custom-card">样式</Card>);
    expect(container.firstElementChild?.className).toContain('custom-card');
  });
});

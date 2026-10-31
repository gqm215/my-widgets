import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('渲染 children', () => {
    render(<Badge>已完成</Badge>);
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('已完成').tagName).toBe('SPAN');
  });

  it('默认使用 default 变体样式', () => {
    render(<Badge>默认</Badge>);
    expect(screen.getByText('默认').className).toContain('bg-ink-100/80');
  });

  it('应用 vermilion 变体样式', () => {
    render(<Badge variant="vermilion">朱砂</Badge>);
    expect(screen.getByText('朱砂').className).toContain('bg-vermilion/10');
  });

  it('应用 rattan 变体样式', () => {
    render(<Badge variant="rattan">藤黄</Badge>);
    expect(screen.getByText('藤黄').className).toContain('bg-rattan/10');
  });

  it('应用 success 变体样式', () => {
    render(<Badge variant="success">成功</Badge>);
    expect(screen.getByText('成功').className).toContain('bg-success/10');
  });

  it('应用 ink 变体样式', () => {
    render(<Badge variant="ink">墨色</Badge>);
    expect(screen.getByText('墨色').className).toContain('bg-ink-700');
  });

  it('合并自定义 className', () => {
    render(<Badge className="ml-2">标签</Badge>);
    expect(screen.getByText('标签').className).toContain('ml-2');
  });
});

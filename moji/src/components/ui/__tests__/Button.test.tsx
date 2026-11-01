import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('渲染按钮并显示 children 内容', () => {
    render(<Button>点击我</Button>);
    expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument();
  });

  it('primary variant 为默认值', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('data-variant')).toBe('primary');
  });

  it('应用 secondary variant 样式', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('data-variant')).toBe('secondary');
  });

  it('应用 ghost variant 样式', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('data-variant')).toBe('ghost');
  });

  it('应用 danger variant 样式', () => {
    render(<Button variant="danger">Danger</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('data-variant')).toBe('danger');
  });

  it('应用 outline variant 样式', () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('data-variant')).toBe('outline');
  });

  it('应用 sm size 样式', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-sm');
  });

  it('应用 md size 为默认', () => {
    render(<Button>Default</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('rounded-md');
  });

  it('应用 lg size 样式', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-lg');
  });

  it('disabled 状态下按钮不可点击', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('点击按钮触发 onClick 事件', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disabled 状态下不触发 onClick', async () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('支持自定义 className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('custom-class');
  });

  it('渲染为 button 元素', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button').tagName).toBe('BUTTON');
  });
});
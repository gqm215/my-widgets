import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('渲染 label 并通过 htmlFor 关联输入框', () => {
    render(<Input label="姓名" />);
    const input = screen.getByLabelText('姓名');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('id', '姓名');
  });

  it('自定义 id 优先于 label 生成的 id', () => {
    render(<Input label="邮箱" id="email-input" />);
    expect(screen.getByLabelText('邮箱')).toHaveAttribute('id', 'email-input');
  });

  it('显示错误信息并使用错误边框', () => {
    render(<Input label="邮箱" error="邮箱格式不正确" />);
    expect(screen.getByText('邮箱格式不正确')).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱')).toHaveClass('border-vermilion');
  });

  it('无错误时使用默认边框且不渲染错误信息', () => {
    render(<Input label="昵称" />);
    const input = screen.getByLabelText('昵称');
    expect(input).toHaveClass('border-paper-dark');
    expect(input).not.toHaveClass('border-vermilion');
    expect(screen.queryByText('邮箱格式不正确')).not.toBeInTheDocument();
  });

  it('错误状态不保留默认边框类', () => {
    render(<Input label="昵称" error="必填" />);
    expect(screen.getByLabelText('昵称')).not.toHaveClass('border-paper-dark');
  });

  it('支持输入并触发 onChange', async () => {
    const handleChange = vi.fn();
    render(<Input label="搜索" onChange={handleChange} />);
    await userEvent.type(screen.getByLabelText('搜索'), 'abc');
    expect(handleChange).toHaveBeenCalledTimes(3);
  });

  it('forwardRef 指向原生 input 元素', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input label="引用" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText('引用'));
  });

  it('支持 disabled/placeholder/type 透传', () => {
    render(<Input label="密码" type="password" placeholder="请输入" disabled />);
    const input = screen.getByLabelText('密码');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('placeholder', '请输入');
    expect(input).toBeDisabled();
  });

  it('合并自定义 className', () => {
    render(<Input label="样式" className="custom-input" />);
    expect(screen.getByLabelText('样式').className).toContain('custom-input');
  });
});

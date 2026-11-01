import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '@/components/ui/Textarea';

describe('Textarea', () => {
  it('渲染 label 并通过 htmlFor 关联文本域', () => {
    render(<Textarea label="备注" />);
    const textarea = screen.getByLabelText('备注');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('id', '备注');
  });

  it('自定义 id 优先于 label 生成的 id', () => {
    render(<Textarea label="备注" id="note-body" />);
    expect(screen.getByLabelText('备注')).toHaveAttribute('id', 'note-body');
  });

  it('显示错误信息并使用错误边框', () => {
    render(<Textarea label="内容" error="内容不能为空" />);
    expect(screen.getByText('内容不能为空')).toBeInTheDocument();
    expect(screen.getByLabelText('内容')).toHaveClass('border-vermilion');
  });

  it('无错误时使用默认边框', () => {
    render(<Textarea label="内容" />);
    const textarea = screen.getByLabelText('内容');
    expect(textarea).toHaveClass('border-paper-dark');
    expect(textarea).not.toHaveClass('border-vermilion');
  });

  it('支持输入并触发 onChange', async () => {
    const handleChange = vi.fn();
    render(<Textarea label="正文" onChange={handleChange} />);
    await userEvent.type(screen.getByLabelText('正文'), '墨记');
    expect(handleChange).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('正文')).toHaveValue('墨记');
  });

  it('forwardRef 指向原生 textarea 元素', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea label="引用" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText('引用'));
  });

  it('透传 rows/placeholder 并合并 className', () => {
    render(<Textarea label="描述" rows={5} placeholder="写点什么" className="custom-textarea" />);
    const textarea = screen.getByLabelText('描述');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toHaveAttribute('placeholder', '写点什么');
    expect(textarea.className).toContain('custom-textarea');
  });
});

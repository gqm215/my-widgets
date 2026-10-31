import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function setup(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const utils = render(
    <ConfirmDialog open message="确定删除这条笔记吗？" onClose={onClose} onConfirm={onConfirm} {...overrides} />
  );
  return { onClose, onConfirm, ...utils };
}

describe('ConfirmDialog', () => {
  it('open=false 时不渲染内容', () => {
    const { container } = render(
      <ConfirmDialog open={false} message="删除？" onClose={() => {}} onConfirm={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('渲染默认标题与消息', () => {
    setup();
    expect(screen.getByRole('heading', { name: '确认操作' })).toBeInTheDocument();
    expect(screen.getByText('确定删除这条笔记吗？')).toBeInTheDocument();
  });

  it('点击确定同时触发 onConfirm 与 onClose', async () => {
    const { onConfirm, onClose } = setup();
    await userEvent.click(screen.getByRole('button', { name: '确定' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('点击取消只触发 onClose', async () => {
    const { onConfirm, onClose } = setup();
    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('支持自定义标题与按钮文案', () => {
    setup({ title: '移入回收站', confirmLabel: '删除', cancelLabel: '再想想' });
    expect(screen.getByRole('heading', { name: '移入回收站' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再想想' })).toBeInTheDocument();
  });

  it('variant=primary 时确定按钮使用主色变体', () => {
    setup({ variant: 'primary' });
    expect(screen.getByRole('button', { name: '确定' }).getAttribute('data-variant')).toBe('primary');
  });

  it('默认 danger 变体', () => {
    setup();
    expect(screen.getByRole('button', { name: '确定' }).getAttribute('data-variant')).toBe('danger');
  });
});

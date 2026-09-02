import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  it('open=false 时不渲染任何内容', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    );
    expect(container.innerHTML).toBe('');
  });

  it('open=true 时渲染内容', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('渲染标题', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test Title">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('点击关闭按钮触发 onClose', async () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    const closeBtn = screen.getByRole('button');
    await userEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('按 ESC 键触发 onClose', async () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <p>Content</p>
      </Modal>
    );
    await userEvent.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('点击遮罩层触发 onClose', async () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <p>Content</p>
      </Modal>
    );
    // 遮罩层是 role="dialog" 的 div，点击其背景
    const overlay = screen.getByRole('dialog');
    await userEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('点击内容区域不触发 onClose', async () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <p>Content</p>
      </Modal>
    );
    await userEvent.click(screen.getByText('Content'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('支持自定义 className', () => {
    render(
      <Modal open={true} onClose={() => {}} className="custom-modal">
        <p>Content</p>
      </Modal>
    );
    const contentDiv = screen.getByTestId('modal-content');
    expect(contentDiv.className).toContain('custom-modal');
  });

  it('open 从 true 变为 false 时隐藏 Modal', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();

    rerender(
      <Modal open={false} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });
});
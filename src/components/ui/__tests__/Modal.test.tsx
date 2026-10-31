import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

/* =========================================================
   无障碍：焦点管理与 ARIA
   ========================================================= */

describe('Modal 无障碍', () => {
  it('打开时默认聚焦面板', () => {
    render(
      <Modal open onClose={() => {}} title="标题">
        <p>内容</p>
      </Modal>
    );
    expect(screen.getByTestId('modal-content')).toHaveFocus();
  });

  it('优先聚焦 data-autofocus 元素', () => {
    render(
      <Modal open onClose={() => {}} title="标题">
        <input data-autofocus aria-label="名称" />
      </Modal>
    );
    expect(screen.getByLabelText('名称')).toHaveFocus();
  });

  it('支持 React autoFocus 子元素', () => {
    render(
      <Modal open onClose={() => {}} title="标题">
        <input autoFocus aria-label="自动聚焦输入框" />
      </Modal>
    );
    expect(screen.getByLabelText('自动聚焦输入框')).toHaveFocus();
  });

  it('Tab 在最后一个可聚焦元素时循环到第一个', () => {
    render(
      <Modal open onClose={() => {}} title="标题">
        <button>一</button>
        <button>二</button>
      </Modal>
    );
    const last = screen.getByRole('button', { name: '二' });
    const first = screen.getByRole('button', { name: '关闭' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
  });

  it('Shift+Tab 在第一个可聚焦元素时循环到最后一个', () => {
    render(
      <Modal open onClose={() => {}} title="标题">
        <button>一</button>
        <button>二</button>
      </Modal>
    );
    const first = screen.getByRole('button', { name: '关闭' });
    const last = screen.getByRole('button', { name: '二' });
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('焦点在面板上时 Tab 进入第一个可聚焦元素', () => {
    render(
      <Modal open onClose={() => {}} title="标题">
        <button>一</button>
      </Modal>
    );
    const panel = screen.getByTestId('modal-content');
    panel.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus();
  });

  it('焦点在面板上时 Shift+Tab 进入最后一个可聚焦元素', () => {
    render(
      <Modal open onClose={() => {}} title="标题">
        <button>一</button>
      </Modal>
    );
    const panel = screen.getByTestId('modal-content');
    panel.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: '一' })).toHaveFocus();
  });

  it('焦点在 Modal 外部时 Tab 拉回第一个可聚焦元素', () => {
    render(
      <>
        <button>外部按钮</button>
        <Modal open onClose={() => {}} title="标题">
          <button>内部按钮</button>
        </Modal>
      </>
    );
    screen.getByRole('button', { name: '外部按钮' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus();
  });

  it('没有可聚焦元素时 Tab 聚焦面板并阻止默认行为', () => {
    render(
      <Modal open onClose={() => {}}>
        <p>只有文字</p>
      </Modal>
    );
    const panel = screen.getByTestId('modal-content');
    expect(panel).toHaveFocus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(panel).toHaveFocus();
  });

  it('关闭后把焦点归还给触发元素', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>打开</button>
          <Modal open={open} onClose={() => setOpen(false)} title="标题">
            <button>内部按钮</button>
          </Modal>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: '打开' });
    await user.click(trigger);
    expect(screen.getByTestId('modal-content')).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('aria-labelledby 指向标题，role/aria-modal 正确', () => {
    render(
      <Modal open onClose={() => {}} title="设置面板">
        <p>内容</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { name: '设置面板' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id);
    expect(dialog).toHaveAccessibleName('设置面板');
  });

  it('无标题时支持 ariaLabel 作为无障碍名称', () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="确认删除">
        <p>内容</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('确认删除');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  it('打开时锁定背景滚动，关闭后恢复', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="标题">
        <p>内容</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal open={false} onClose={() => {}} title="标题">
        <p>内容</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('ESC 始终调用最新的 onClose', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Modal open onClose={first}>
        <p>内容</p>
      </Modal>
    );
    rerender(
      <Modal open onClose={second}>
        <p>内容</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});

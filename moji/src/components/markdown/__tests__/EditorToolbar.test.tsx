import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import EditorToolbar from '@/components/markdown/EditorToolbar';
import Notes from '@/pages/Notes';
import { TaskDetail } from '@/components/todos/TaskDetail';
import { useAppStore } from '@/store';
import { renderWithProviders, seedStore, makeNote, makeTodo } from '@/test/render';
import { PALETTE_COLORS } from '@/design/palette';

// 预热懒加载 chunk：接线冒烟需要 MarkdownView（B3-T1b 渲染链），先触发动态 import
beforeAll(async () => {
  await import('@/components/markdown/MarkdownViewImpl');
});

/* ---------- 单元测试挂具：受控 textarea + 工具条 ---------- */
function Harness({
  initial,
  onTextChange,
  suffix = '',
}: {
  initial: string;
  onTextChange?: (text: string) => void;
  suffix?: string;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div>
      <EditorToolbar
        textareaRef={ref}
        onChangeText={(text) => {
          setValue(text);
          onTextChange?.(text);
        }}
        label={`测试工具条${suffix}`}
      />
      <textarea
        ref={ref}
        data-testid={`ta${suffix}`}
        aria-label={`测试输入${suffix}`}
        value={value}
        onChange={() => {}}
      />
    </div>
  );
}

function renderHarness(initial: string, onTextChange?: (text: string) => void, suffix = '') {
  const utils = render(<Harness initial={initial} onTextChange={onTextChange} suffix={suffix} />);
  const ta = utils.getByLabelText(`测试输入${suffix}`) as HTMLTextAreaElement;
  const toolbar = utils.getByRole('toolbar', { name: `测试工具条${suffix}` });
  const select = (start: number, end: number) => {
    act(() => {
      ta.focus();
      ta.setSelectionRange(start, end);
      ta.dispatchEvent(new Event('select', { bubbles: true }));
    });
  };
  return { ...utils, ta, toolbar, select };
}

describe('EditorToolbar · 按钮与插入', () => {
  it('八类动作按钮齐备（aria-label + title 语法提示）', () => {
    renderHarness('');
    for (const name of [
      '加粗',
      '斜体',
      '高亮',
      '无序列表',
      '待办列表',
      '行内公式',
      '块级公式',
      '文字颜色',
    ]) {
      const btn = screen.getByRole('button', { name });
      expect(btn).toBeInTheDocument();
      expect(btn.getAttribute('title')).toBeTruthy();
    }
  });

  it('选中文字点加粗 → 值变化、选区保持在内容上', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();
    const { ta, toolbar, select } = renderHarness('你好世界', onTextChange);
    select(0, 4);
    expect(toolbar).toHaveAttribute('data-has-selection', 'on');
    await user.click(screen.getByRole('button', { name: '加粗' }));
    expect(onTextChange).toHaveBeenCalledWith('**你好世界**');
    expect(ta.value).toBe('**你好世界**');
    expect(ta.selectionStart).toBe(2);
    expect(ta.selectionEnd).toBe(6);
  });

  it('无选中点高亮 → 插入 ==== 光标居中', async () => {
    const user = userEvent.setup();
    const { ta } = renderHarness('笔记');
    await user.click(screen.getByRole('button', { name: '高亮' }));
    expect(ta.value).toBe('====笔记');
    expect(ta.selectionStart).toBe(2);
    expect(ta.selectionEnd).toBe(2);
  });

  it('重复触发防抖：选区外侧已是同款语法对时解除包裹', async () => {
    const user = userEvent.setup();
    const { ta, select } = renderHarness('**你好**');
    select(2, 4);
    await user.click(screen.getByRole('button', { name: '加粗' }));
    expect(ta.value).toBe('你好');
    expect(ta.selectionStart).toBe(0);
    expect(ta.selectionEnd).toBe(2);
  });

  it('无序列表：无选中在光标所在行行首插入 - ', async () => {
    const user = userEvent.setup();
    const { ta } = renderHarness('甲\n乙');
    act(() => {
      ta.focus();
      ta.setSelectionRange(2, 2);
    });
    await user.click(screen.getByRole('button', { name: '无序列表' }));
    expect(ta.value).toBe('甲\n- 乙');
  });

  it('行首已有前缀时幂等：不触发 onChange（防抖链不被无谓唤醒）', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();
    const { ta } = renderHarness('- 已有', onTextChange);
    act(() => {
      ta.focus();
      ta.setSelectionRange(0, 0);
    });
    await user.click(screen.getByRole('button', { name: '无序列表' }));
    expect(onTextChange).not.toHaveBeenCalled();
    expect(ta.value).toBe('- 已有');
  });

  it('块级公式按钮插入块级语法对', async () => {
    const user = userEvent.setup();
    const { ta } = renderHarness('');
    await user.click(screen.getByRole('button', { name: '块级公式' }));
    expect(ta.value).toBe('$$\n\n$$');
    expect(ta.selectionStart).toBe(3);
  });

  it('选中浮现（gaps D6）：textarea 有选中文本时工具条高亮，清选后还原', async () => {
    const { ta, toolbar, select } = renderHarness('文字');
    expect(toolbar.getAttribute('data-has-selection')).toBe('off');
    select(0, 2);
    expect(toolbar.getAttribute('data-has-selection')).toBe('on');
    act(() => {
      ta.setSelectionRange(1, 1);
      ta.dispatchEvent(new Event('select', { bubbles: true }));
    });
    expect(toolbar.getAttribute('data-has-selection')).toBe('off');
  });

  it('ref 为空（textarea 未挂载）时点击不报错不触发回调', async () => {
    const onTextChange = vi.fn();
    const ref = { current: null };
    render(
      <EditorToolbar
        textareaRef={ref as React.RefObject<HTMLTextAreaElement | null>}
        onChangeText={onTextChange}
        label="空挂载工具条"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '加粗' }));
    expect(onTextChange).not.toHaveBeenCalled();
  });
});

describe('EditorToolbar · 颜色面板（ListRail 改色面板交互模式）', () => {
  it('触发按钮展开六色面板，色点取 palette hex，选中色 aria-pressed', async () => {
    const user = userEvent.setup();
    const { ta, select } = renderHarness('词');
    select(0, 1);
    expect(screen.queryByRole('group', { name: '高亮颜色' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '文字颜色' }));
    // 暗色可辨识度（类名/令牌断言层）：色点底色 = palette hex（亮暗各由令牌体系呈现，手工核查留 B7 QA）
    for (const color of PALETTE_COLORS) {
      const swatch = screen.getByRole('button', { name: `插入${color.name}高亮` });
      expect(swatch).toHaveStyle({ backgroundColor: color.hex });
    }
    const panel = screen.getByRole('group', { name: '高亮颜色' });
    expect(panel).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '插入青碧高亮' }));
    // 插入生效且面板保持展开（便于连续插多色），选中色 aria-pressed
    expect(ta.value).toBe('<mark class="c-teal">词</mark>');
    expect(screen.getByRole('button', { name: '插入青碧高亮' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '插入朱砂高亮' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('Esc 关闭面板', async () => {
    const user = userEvent.setup();
    renderHarness('');
    await user.click(screen.getByRole('button', { name: '文字颜色' }));
    expect(screen.getByRole('group', { name: '高亮颜色' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: '高亮颜色' })).toBeNull();
  });

  it('面板展开时的其它按键不关闭', async () => {
    const user = userEvent.setup();
    renderHarness('');
    await user.click(screen.getByRole('button', { name: '文字颜色' }));
    expect(screen.getByRole('group', { name: '高亮颜色' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('group', { name: '高亮颜色' })).toBeInTheDocument();
  });

  it('外点关闭（触发按钮自身保留 toggle 语义）', async () => {
    const user = userEvent.setup();
    renderHarness('');
    await user.click(screen.getByRole('button', { name: '文字颜色' }));
    expect(screen.getByRole('group', { name: '高亮颜色' })).toBeInTheDocument();
    // 外点（面板与触发按钮之外）
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('group', { name: '高亮颜色' })).toBeNull();
    // 触发按钮再开、再点触发按钮 = 收起（toggle）
    await user.click(screen.getByRole('button', { name: '文字颜色' }));
    expect(screen.getByRole('group', { name: '高亮颜色' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '文字颜色' }));
    expect(screen.queryByRole('group', { name: '高亮颜色' })).toBeNull();
  });
});

describe('EditorToolbar · 快捷键（挂载在目标 textarea）', () => {
  it('Ctrl+B 加粗', () => {
    const onTextChange = vi.fn();
    const { ta, select } = renderHarness('文字', onTextChange);
    select(0, 2);
    fireEvent.keyDown(ta, { ctrlKey: true, key: 'b' });
    expect(onTextChange).toHaveBeenCalledWith('**文字**');
  });

  it('Ctrl+Shift+H 高亮（含大写 H 形态）', () => {
    const onTextChange = vi.fn();
    const first = renderHarness('文字', onTextChange);
    first.select(0, 2);
    fireEvent.keyDown(first.ta, { ctrlKey: true, shiftKey: true, key: 'H' });
    expect(onTextChange).toHaveBeenCalledWith('==文字==');
    // 小写 h 同样触发（新挂具：上一文本再按会命中 toggle 解除语义，另行在纯函数用例锁定）
    const second = renderHarness('语言', onTextChange, '二');
    second.select(0, 2);
    fireEvent.keyDown(second.ta, { ctrlKey: true, shiftKey: true, key: 'h' });
    expect(onTextChange).toHaveBeenCalledWith('==语言==');
  });

  it('无修饰键或其它组合不触发插入', () => {
    const onTextChange = vi.fn();
    const { ta } = renderHarness('文字', onTextChange);
    fireEvent.keyDown(ta, { key: 'b' });
    fireEvent.keyDown(ta, { ctrlKey: true, key: 'x' });
    fireEvent.keyDown(ta, { ctrlKey: true, key: 'h' }); // H 需 Shift，纯 Ctrl+H 不触发
    expect(onTextChange).not.toHaveBeenCalled();
  });
});

describe('Notes 接线冒烟（B3-T2）', () => {
  it('编辑器渲染工具条；插入高亮语法后预览出现对应 mark', async () => {
    seedStore({
      notes: [makeNote({ id: 'n1', title: '预览同步', content: '重要内容' })],
    });
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/:id" element={<Notes />} />
      </Routes>,
      { route: '/notes/n1' },
    );

    const toolbar = screen.getByRole('toolbar', { name: '笔记编辑工具条' });
    expect(toolbar).toBeInTheDocument();
    const ta = screen.getByLabelText('笔记内容') as HTMLTextAreaElement;
    await waitFor(() => {
      expect(ta).toHaveValue('重要内容');
    });

    // 选中全部文字 → 点高亮 → textarea 值变化（onChange 走既有防抖保存链）
    act(() => {
      ta.focus();
      ta.setSelectionRange(0, 4);
      ta.dispatchEvent(new Event('select', { bubbles: true }));
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '高亮' }));
    expect(ta.value).toBe('==重要内容==');

    // 防抖 400ms 后保存 + 预览（B3-T1b 渲染链）出现无色名 mark
    const preview = container.querySelector('.markdown-body') as HTMLElement;
    await waitFor(
      () => {
        expect(preview.querySelector('mark')?.textContent).toBe('重要内容');
      },
      { timeout: 3000 },
    );
    await waitFor(() => {
      expect(useAppStore.getState().notes[0].content).toBe('==重要内容==');
    });
  });

  it('颜色按钮插入六色语法，预览渲染 c-* 类（B3-T1b 白名单）', async () => {
    seedStore({
      notes: [makeNote({ id: 'n2', title: '六色笔记', content: '青碧文字' })],
    });
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/:id" element={<Notes />} />
      </Routes>,
      { route: '/notes/n2' },
    );
    const ta = screen.getByLabelText('笔记内容') as HTMLTextAreaElement;
    await waitFor(() => {
      expect(ta).toHaveValue('青碧文字');
    });
    act(() => {
      ta.focus();
      ta.setSelectionRange(0, 4);
      ta.dispatchEvent(new Event('select', { bubbles: true }));
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '文字颜色' }));
    await user.click(screen.getByRole('button', { name: '插入青碧高亮' }));
    expect(ta.value).toBe('<mark class="c-teal">青碧文字</mark>');
    const preview = container.querySelector('.markdown-body') as HTMLElement;
    await waitFor(
      () => {
        const mark = preview.querySelector('mark');
        expect(mark).not.toBeNull();
        expect(mark).toHaveClass('c-teal');
      },
      { timeout: 3000 },
    );
  });
});

describe('TaskDetail 接线冒烟（B3-T2）', () => {
  it('描述编辑态渲染工具条，插入高亮语法；预览态工具条隐藏且渲染 mark', async () => {
    const todo = makeTodo({ id: 't1', title: '带描述任务', description: '' });
    render(<TaskDetail todo={todo} subtasks={[]} />);

    // 空描述 → 初始编辑态，工具条在场
    const toolbar = screen.getByRole('toolbar', { name: '描述编辑工具条' });
    expect(toolbar).toBeInTheDocument();
    const ta = screen.getByLabelText('任务描述') as HTMLTextAreaElement;
    const user = userEvent.setup();
    await user.type(ta, '关键事项');
    act(() => {
      ta.focus();
      ta.setSelectionRange(0, 4);
      ta.dispatchEvent(new Event('select', { bubbles: true }));
    });
    await user.click(screen.getByRole('button', { name: '高亮' }));
    expect(ta.value).toBe('==关键事项==');

    // 预览态：工具条不在场，预览渲染 mark
    await user.click(screen.getByRole('button', { name: '预览' }));
    await waitFor(() => {
      expect(screen.queryByRole('toolbar', { name: '描述编辑工具条' })).toBeNull();
    });
    const preview = screen.getByLabelText('描述预览');
    await waitFor(() => {
      expect(preview.querySelector('mark')?.textContent).toBe('关键事项');
    });
  });
});

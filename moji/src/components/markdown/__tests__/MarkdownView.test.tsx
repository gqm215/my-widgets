import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import MarkdownView from '@/components/markdown/MarkdownView';
import Notes from '@/pages/Notes';
import { TaskDetail } from '@/components/todos/TaskDetail';
import {
  renderWithProviders,
  seedStore,
  makeNote,
  makeTodo,
} from '@/test/render';

// 预热懒加载 chunk：vite-node 首次按需编译 react-markdown + katex 链路耗时可能
// 超过 waitFor 默认 1s，先在本测试文件内触发动态 import 完成编译，
// React.lazy 随后拿到缓存的模块 promise，用例只验证真实的异步渲染路径
beforeAll(async () => {
  await import('@/components/markdown/MarkdownViewImpl');
});

/** 渲染共享 MarkdownView（内容经 React.lazy 异步出现，断言统一 await waitFor） */
function renderMd(content: string, variant: 'note' | 'detail' = 'note') {
  return render(<MarkdownView variant={variant}>{content}</MarkdownView>);
}

describe('MarkdownView · 公式渲染（B3-T1a）', () => {
  it('行内公式 $...$ 渲染 KaTeX，原文不再出现美元定界符', async () => {
    const { container } = renderMd('质能方程 $E=mc^2$ 是物理基石。');
    await waitFor(() => {
      expect(container.querySelector('.katex')).toBeInTheDocument();
    });
    // KaTeX htmlAndMathml 输出：annotation 保留 TeX 原文
    const annotation = container.querySelector('annotation');
    expect(annotation?.getAttribute('encoding')).toBe('application/x-tex');
    expect(annotation?.textContent).toBe('E=mc^2');
    // 公式外的普通文本保留，定界符不再以字面出现
    expect(container.textContent).toContain('质能方程');
    expect(container.textContent).toContain('是物理基石。');
    expect(container.textContent).not.toContain('$');
  });

  it('块级公式 $$...$$ 渲染 katex-display', async () => {
    const { container } = renderMd('$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$');
    await waitFor(() => {
      expect(container.querySelector('.katex-display')).toBeInTheDocument();
    });
    const annotation = container.querySelector('annotation');
    expect(annotation?.textContent).toBe('\\int_0^1 x^2\\,dx = \\frac{1}{3}');
  });
});

describe('MarkdownView · 无公式内容回归（与改造前渲染结果一致）', () => {
  const LEGACY_DOC = [
    '# 一级',
    '',
    '段落与 `行内代码` 以及 [链接](https://example.com)',
    '',
    '## 二级标题',
    '',
    '> 引用一句',
    '',
    '- [x] 已办',
    '- [ ] 未办',
    '',
    '```',
    'const x = 1',
    '```',
  ].join('\n');

  it('全要素 Markdown 元素结构不变，且不产生 KaTeX 节点', async () => {
    const { container } = renderMd(LEGACY_DOC);
    await waitFor(() => {
      expect(container.querySelector('h1')).toBeInTheDocument();
    });
    expect(container.querySelector('h2')?.textContent).toBe('二级标题');
    expect(container.querySelector('code')?.textContent).toBe('行内代码');
    expect(container.querySelector('pre')?.textContent).toContain('const x = 1');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    expect(container.querySelector('blockquote')).toBeInTheDocument();
    // remark-gfm 任务列表保留
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toHaveAttribute('checked');
    // 无公式内容不得出现 KaTeX 产物
    expect(container.querySelector('.katex')).not.toBeInTheDocument();
  });

  it('孤立美元符（不成对的 $）保持字面，不误判为公式', async () => {
    // remark-math 会把同段内成对的 $...$ 跨文本配对（含空格/CJK），
    // 故「字面保留」边界只对不成对的孤立 $ 成立
    const { container } = renderMd('预算 100$，超支自负。');
    await waitFor(() => {
      expect(container.querySelector('p')).toBeInTheDocument();
    });
    expect(container.querySelector('.katex')).not.toBeInTheDocument();
    expect(container.textContent).toContain('100$');
  });

  it('两处档位类名逐字锁定：note = D6 原始排版，detail = B2-T2 紧凑排版', async () => {
    const noteView = renderMd('# 标题\n\n段落', 'note');
    await waitFor(() => {
      expect(noteView.container.querySelector('h1')).toBeInTheDocument();
    });
    expect(noteView.container.querySelector('p')).toHaveClass('mb-4');
    expect(noteView.container.querySelector('h1')).toHaveClass('text-2xl', 'mb-4', 'mt-6');

    const detailView = renderMd('# 标题\n\n段落', 'detail');
    await waitFor(() => {
      expect(detailView.container.querySelector('h1')).toBeInTheDocument();
    });
    expect(detailView.container.querySelector('p')).toHaveClass('mb-3', 'last:mb-0');
    expect(detailView.container.querySelector('h1')).toHaveClass('text-xl', 'mb-3', 'mt-4');
  });
});

describe('MarkdownView · 两处用法冒烟（B3-T1a）', () => {
  it('Notes 预览渲染笔记中的行内公式', async () => {
    seedStore({
      notes: [
        makeNote({ id: 'n1', title: '物理笔记', content: '能量 $E=mc^2$ 摘录' }),
      ],
    });
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/:id" element={<Notes />} />
      </Routes>,
      { route: '/notes/n1' },
    );

    const preview = container.querySelector('.markdown-body') as HTMLElement;
    expect(preview).not.toBeNull();
    await waitFor(() => {
      expect(preview.querySelector('.katex')).toBeInTheDocument();
    });
    expect(preview.textContent).toContain('能量');
  });

  it('TaskDetail 描述预览渲染块级公式', async () => {
    const todo = makeTodo({
      id: 't1',
      title: '数学作业',
      description: '$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$',
    });
    render(<TaskDetail todo={todo} subtasks={[]} />);

    const preview = screen.getByLabelText('描述预览');
    await waitFor(() => {
      expect(preview.querySelector('.katex-display')).toBeInTheDocument();
    });
    expect(preview.querySelector('annotation')?.textContent).toContain('\\sum');
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import MarkdownView from '@/components/markdown/MarkdownView';
import { PALETTE_COLORS } from '@/design/palette';

// 预热懒加载 chunk：与 MarkdownView.test.tsx 同策略，先触发动态 import
beforeAll(async () => {
  await import('@/components/markdown/MarkdownViewImpl');
});

/** 渲染并等待懒加载完成（以首个可见块级/行内产物为就绪信号） */
async function renderMd(content: string) {
  const utils = render(<MarkdownView>{content}</MarkdownView>);
  await waitFor(() => {
    expect(
      utils.container.querySelector('p, mark, span, pre, code, .katex-display, h1'),
    ).not.toBeNull();
  });
  return utils.container;
}

/** XSS 等可能产出空内容的用例：前置锚点段落作为懒加载就绪信号 */
async function renderMdAnchored(html: string) {
  return renderMd(`锚点\n\n${html}`);
}

describe('B3-T1b · ==文字== 高亮', () => {
  it('基本高亮：==重点== 渲染为 mark，前后文本保留、定界符不再出现', async () => {
    const container = await renderMd('前 ==重点== 后');
    const mark = container.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe('重点');
    expect(container.textContent).toContain('前');
    expect(container.textContent).toContain('后');
    expect(container.textContent).not.toContain('==');
  });

  it('同段多处高亮各自成对', async () => {
    const container = await renderMd('==甲==与==乙==');
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe('甲');
    expect(marks[1].textContent).toBe('乙');
  });

  it('连续定界符最小配对：==a==b==c== 只高亮首尾段，中段字面保留', async () => {
    const container = await renderMd('==a==b==c==');
    const marks = Array.from(container.querySelectorAll('mark')).map((m) => m.textContent);
    expect(marks).toEqual(['a', 'c']);
    expect(container.textContent).toContain('b');
  });

  it('与 KaTeX 共存：==$E=mc^2$== 公式整体包进 mark 且无字面定界符', async () => {
    const container = await renderMd('==$E=mc^2$==');
    const mark = container.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark?.querySelector('.katex')).not.toBeNull();
    expect(container.textContent).not.toContain('==');
  });

  it('带前后缀的跨节点配对：前==$\\rho$==后，公式与文字互不吞并', async () => {
    const container = await renderMd('前==$\\rho$==后');
    const mark = container.querySelector('mark');
    expect(mark?.querySelector('.katex')).not.toBeNull();
    expect(container.textContent).toContain('前');
    expect(container.textContent).toContain('后');
    expect(container.textContent).not.toContain('==');
  });

  it('跨节点配对同样适用于行内代码：==`x=1`==', async () => {
    const container = await renderMd('==`x=1`==');
    const mark = container.querySelector('mark');
    expect(mark?.querySelector('code')?.textContent).toBe('x=1');
  });

  it('跨节点多对配对：==$a$==$b$==$c$== → 两对 mark + 一处公式字面定界符', async () => {
    const container = await renderMd('==$a$==$b$==$c$==');
    expect(container.querySelectorAll('mark')).toHaveLength(2);
    expect(container.querySelectorAll('.katex')).toHaveLength(3);
  });

  it('反例：定界符内侧空白不配对（== 重点 == 保持字面）', async () => {
    const container = await renderMd('== 重点 ==');
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toContain('== 重点 ==');
  });

  it('反例：闭侧缺位不误伤（a==$x$ 未闭合 保持字面且无 mark）', async () => {
    const container = await renderMd('a==$x$ 未闭合');
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toContain('a==');
    expect(container.textContent).toContain('未闭合');
  });

  it('反例：等号连跑（=== / ====）与算式 == 一律字面', async () => {
    const container = await renderMd('===与====与 1 == 2 与 x a== 结尾');
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toContain('===');
    expect(container.textContent).toContain('====');
    expect(container.textContent).toContain('1 == 2');
    expect(container.textContent).toContain('x a==');
  });

  it('反例：闭侧内侧空白（==a ==b）不配对', async () => {
    const container = await renderMd('==a ==b');
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toContain('==a ==b');
  });

  it('反例：跨节点开侧带空白（a ==$x$==）保守不配对', async () => {
    const container = await renderMd('a ==$x$== 与 a===$y$==');
    expect(container.querySelector('mark')).toBeNull();
  });

  it('行内代码内 == 不误伤', async () => {
    const container = await renderMd('`==x==`');
    expect(container.querySelector('mark')).toBeNull();
    expect(container.querySelector('code')?.textContent).toBe('==x==');
  });

  it('围栏代码块内 == 不误伤', async () => {
    const container = await renderMd('```\n==x==\n```');
    expect(container.querySelector('mark')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toContain('==x==');
  });

  it('高亮与块级公式同文档共存互不吞并', async () => {
    const container = await renderMd('==重点==\n\n$$\n\\sum_{i=1}^n i\n$$');
    expect(container.querySelector('mark')?.textContent).toBe('重点');
    expect(container.querySelector('.katex-display')).not.toBeNull();
  });
});

describe('B3-T1b · 六色类名白名单渲染', () => {
  it('<mark class="c-*"> 六色逐一渲染，类名来自 palette.ts', async () => {
    for (const color of PALETTE_COLORS) {
      const container = await renderMd(`<mark class="${color.className}">字</mark>`);
      const mark = container.querySelector('mark');
      expect(mark, color.className).not.toBeNull();
      expect(mark?.className, color.className).toBe(color.className);
      expect(mark?.textContent, color.className).toBe('字');
    }
  });

  it('<span class="c-*"> 六色逐一渲染，类名来自 palette.ts', async () => {
    for (const color of PALETTE_COLORS) {
      const container = await renderMd(`<span class="${color.className}">词</span>`);
      const span = container.querySelector('span');
      expect(span, color.className).not.toBeNull();
      expect(span?.className, color.className).toBe(color.className);
      expect(span?.textContent, color.className).toBe('词');
    }
  });

  it('混合类名：白名单保留、其余剥除（不限顺序）', async () => {
    const container = await renderMd(
      '<span class="c-teal evil">x</span> 与 <span class="evil c-rattan">y</span>',
    );
    const spans = container.querySelectorAll('span');
    expect(spans[0]).toHaveClass('c-teal');
    expect(spans[0]).not.toHaveClass('evil');
    expect(spans[1]).toHaveClass('c-rattan');
    expect(spans[1]).not.toHaveClass('evil');
  });

  it('重复白名单类名去重', async () => {
    const container = await renderMd('<span class="c-teal c-teal">x</span>');
    expect(container.querySelector('span')?.className).toBe('c-teal');
  });

  it('仅非白名单类名：剥类名保元素与文本', async () => {
    const container = await renderMd('<span class="foo">正文</span>');
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.className).toBe('');
    expect(span?.textContent).toBe('正文');
  });

  it('无类名的裸 mark / span 正常渲染', async () => {
    const container = await renderMd('<mark>字</mark><span>词</span>');
    expect(container.querySelector('mark')?.className).toBe('');
    expect(container.querySelector('span')?.className).toBe('');
  });

  it('事件/样式/锚点等属性一律剥除，仅 class 参与白名单', async () => {
    const container = await renderMd(
      '<mark onclick="alert(1)" onmouseover="x()" id="m" style="color:red">字</mark>',
    );
    const mark = container.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark?.getAttribute('onclick')).toBeNull();
    expect(mark?.getAttribute('onmouseover')).toBeNull();
    expect(mark?.getAttribute('id')).toBeNull();
    expect(mark?.getAttribute('style')).toBeNull();
  });

  it('class 引号形态：单引号 / 无引号均可识别', async () => {
    const container = await renderMd(
      "<span class='c-teal'>甲</span> 与 <span class=c-rattan>乙</span>",
    );
    const spans = container.querySelectorAll('span');
    expect(spans[0]).toHaveClass('c-teal');
    expect(spans[1]).toHaveClass('c-rattan');
  });

  it('自闭合形态 <span class="c-teal"/> 正常渲染', async () => {
    const container = await renderMd('<span class="c-teal"/>x');
    const span = container.querySelector('span');
    expect(span).toHaveClass('c-teal');
    expect(container.textContent).toContain('x');
  });
});

describe('B3-T1b · XSS 剥离（最高优先验收）', () => {
  it('块级 <script> 整体剥除，脚本内容不出现', async () => {
    const container = await renderMdAnchored('<script>alert(1)</script>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('alert(1)');
    expect(container.textContent).toContain('锚点');
  });

  it('段内 <script> 连同兄弟文本节点整体剥除', async () => {
    const container = await renderMd('foo <script>alert(1)</script> bar');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('alert(1)');
    expect(container.textContent).toContain('foo');
    expect(container.textContent).toContain('bar');
  });

  it('大小写混淆 <ScRiPt> 同样剥除', async () => {
    const container = await renderMdAnchored('<ScRiPt>alert(1)</ScRiPt>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('alert(1)');
  });

  it('<img onerror=...> 剥标签（void 元素无文本），无 img 无事件', async () => {
    const container = await renderMdAnchored('<img src=x onerror="alert(1)">');
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).not.toContain('alert(1)');
  });

  it('<style> 标签连同 CSS 内容整体剥除', async () => {
    const container = await renderMdAnchored('<style>p{color:red}</style>尾');
    expect(container.querySelector('style')).toBeNull();
    expect(container.textContent).not.toContain('color:red');
    expect(container.textContent).toContain('尾');
  });

  it('<iframe> 整体剥除', async () => {
    const container = await renderMdAnchored('<iframe src="https://evil.example"></iframe>');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('<div style=...> 未知标签剥标签保文本，无 style 属性残留', async () => {
    const container = await renderMdAnchored('<div style="position:fixed">正文</div>');
    expect(container.querySelector('div')).toBeNull();
    expect(container.querySelector('[style]')).toBeNull();
    expect(container.textContent).toContain('正文');
  });

  it('HTML 注释整体丢弃', async () => {
    const container = await renderMd('前 <!-- secret --> 后');
    expect(container.textContent).not.toContain('secret');
    expect(container.textContent).toContain('前');
    expect(container.textContent).toContain('后');
  });

  it('CDATA / 处理指令 / DOCTYPE 声明整体丢弃', async () => {
    const c1 = await renderMdAnchored('<![CDATA[数据]]>');
    expect(c1.textContent).not.toContain('数据');
    const c2 = await renderMdAnchored('<?php echo 1 ?>');
    expect(c2.textContent).not.toContain('php');
    const c3 = await renderMdAnchored('<!DOCTYPE html>');
    expect(c3.textContent).not.toContain('DOCTYPE');
  });

  it('未知标签剥标签保文本：<b>粗</b> → 仅文本', async () => {
    const container = await renderMd('甲 <b>粗</b> 乙');
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('甲');
    expect(container.textContent).toContain('粗');
    expect(container.textContent).toContain('乙');
  });

  it('危险标签内嵌套的标签与文本一并剥除，其后内容恢复', async () => {
    const container = await renderMdAnchored('<script><b>x</b>嵌套</script>尾');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).not.toContain('嵌套');
    expect(container.textContent).toContain('尾');
  });

  it('未闭合 <script> 剥至内容末尾，无泄漏', async () => {
    const container = await renderMdAnchored('<script>残留');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('残留');
    expect(container.textContent).toContain('锚点');
  });

  it('游离闭合标签忽略，文本保留', async () => {
    const container = await renderMd('</mark>孤');
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toContain('孤');
  });

  it('未闭合白名单标签自动闭合，内容保留', async () => {
    const container = await renderMd('<mark>未闭合');
    expect(container.querySelector('mark')?.textContent).toBe('未闭合');
  });

  it('嵌套未配对内层元素随外层闭合一并收拢', async () => {
    const container = await renderMd('<mark><span>x</mark>后');
    const mark = container.querySelector('mark');
    expect(mark?.textContent).toBe('x');
    expect(mark?.querySelector('span')?.textContent).toBe('x');
    expect(container.textContent).toContain('后');
  });

  it('类名大小写敏感：CLASS="C-TEAL" 不在白名单，剥类名保文本', async () => {
    const container = await renderMd('<span CLASS="C-TEAL">字</span>');
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.className).toBe('');
    expect(span?.textContent).toBe('字');
  });

  it('<svg> 外来内容整体剥除，其后文本恢复', async () => {
    const container = await renderMdAnchored('<svg><circle onload="x()"/></svg>后文');
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('circle')).toBeNull();
    expect(container.textContent).toContain('后文');
  });
});

describe('B3-T1b · javascript: 协议剥离（主控补充验收）', () => {
  it('raw <a href="javascript:..."> 整体剥标签，不产生任何链接', async () => {
    const container = await renderMdAnchored('<a href="javascript:alert(1)">点击</a>');
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('点击');
  });

  it('属性与协议大小写混淆（HREF / JaVaScRiPt:）同样无链接产出', async () => {
    const container = await renderMdAnchored('<a HREF="JaVaScRiPt:alert(1)">点</a>');
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('点');
  });

  it('raw <img src="javascript:..."> 无产出', async () => {
    const container = await renderMdAnchored('<img src="javascript:alert(1)">');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[src]')).toBeNull();
  });

  it('实体编码变体（jav&#x09;ascript:）因属性不解析而无链接', async () => {
    const container = await renderMdAnchored('<a href="jav&#x09;ascript:alert(1)">点</a>');
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('点');
  });

  it('Markdown 链接 [x](javascript:...) 由 react-markdown UrlTransform 中和', async () => {
    const container = await renderMd('[x](javascript:alert(1))');
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a?.getAttribute('href') ?? '').not.toContain('javascript');
    expect(container.textContent).toContain('x');
  });

  it('Markdown 链接协议大小写混淆同样被中和', async () => {
    const container = await renderMd('[x](JaVaScRiPt:alert(1))');
    const a = container.querySelector('a');
    expect(a?.getAttribute('href') ?? '').not.toContain('javascript');
  });

  it('安全协议 https 链接不受影响（回归）', async () => {
    const container = await renderMd('[文档](https://example.com)');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });
});

describe('B3-T1b · 样式层一致性守卫', () => {
  const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');

  it('palette 六色类名在 index.css 均有亮/暗规则（单一事实源同步）', () => {
    for (const color of PALETTE_COLORS) {
      expect(css).toContain(`.markdown-body .${color.className}`);
      expect(css).toContain(`html.dark .markdown-body .${color.className}`);
    }
  });

  it('无色名 mark 的亮暗基底样式存在', () => {
    expect(css).toContain('.markdown-body mark');
    expect(css).toContain('html.dark .markdown-body mark');
  });
});

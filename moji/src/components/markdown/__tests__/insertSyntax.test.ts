import { describe, expect, it } from 'vitest';
import { applyInsert, type ToolbarAction } from '@/components/markdown/insertSyntax';
import { PALETTE_COLORS } from '@/design/palette';

describe('insertSyntax · 包裹型动作', () => {
  it('加粗：选中文字被 ** 包裹，选区保持在内容上', () => {
    const r = applyInsert('bold', '你好世界', 0, 4);
    expect(r).toEqual({ text: '**你好世界**', selStart: 2, selEnd: 6 });
  });

  it('加粗：无选中插入语法对，光标落在两段之间', () => {
    const r = applyInsert('bold', 'abc', 1, 1);
    expect(r).toEqual({ text: 'a****bc', selStart: 3, selEnd: 3 });
  });

  it('加粗：重复触发防抖——选区外侧已是 ** 对时解除包裹', () => {
    const r = applyInsert('bold', '**你好**', 2, 4);
    expect(r).toEqual({ text: '你好', selStart: 0, selEnd: 2 });
  });

  it('加粗：解除后再触发重新包裹（往返对称）', () => {
    const unwrapped = applyInsert('bold', '**你好**', 2, 6);
    const rewrapped = applyInsert('bold', unwrapped.text, unwrapped.selStart, unwrapped.selEnd);
    expect(rewrapped).toEqual({ text: '**你好**', selStart: 2, selEnd: 6 });
  });

  it('选区在文本中间时包裹正确且后缀完整', () => {
    const r = applyInsert('bold', '前中后', 1, 2);
    expect(r).toEqual({ text: '前**中**后', selStart: 3, selEnd: 4 });
  });

  it('斜体：__ 包裹与无选中插入对', () => {
    expect(applyInsert('italic', '重点', 0, 2)).toEqual({ text: '__重点__', selStart: 2, selEnd: 4 });
    expect(applyInsert('italic', '', 0, 0)).toEqual({ text: '____', selStart: 2, selEnd: 2 });
  });

  it('斜体：已包裹时解除', () => {
    expect(applyInsert('italic', '__词__', 2, 3)).toEqual({ text: '词', selStart: 0, selEnd: 1 });
  });

  it('高亮：== 包裹、无选中插入 ==== 光标居中、重复触发解除', () => {
    expect(applyInsert('highlight', '重点', 0, 2)).toEqual({
      text: '==重点==',
      selStart: 2,
      selEnd: 4,
    });
    expect(applyInsert('highlight', '', 0, 0)).toEqual({ text: '====', selStart: 2, selEnd: 2 });
    expect(applyInsert('highlight', '==词==', 2, 3)).toEqual({
      text: '词',
      selStart: 0,
      selEnd: 1,
    });
  });

  it('行内公式：$ 包裹，无选中插入 $$ 光标居中', () => {
    expect(applyInsert('inlineMath', 'E=mc^2', 0, 6)).toEqual({
      text: '$E=mc^2$',
      selStart: 1,
      selEnd: 7,
    });
    expect(applyInsert('inlineMath', '', 0, 0)).toEqual({ text: '$$', selStart: 1, selEnd: 1 });
  });

  it('行内公式：解除只看选区外侧紧邻字符', () => {
    // x$y$z 选中 y → 两侧紧邻 $ → 解除；内容其余部分（z 前的 b 等）不动
    expect(applyInsert('inlineMath', 'x$y$z', 2, 3)).toEqual({ text: 'xyz', selStart: 1, selEnd: 2 });
  });
});

describe('insertSyntax · 六色高亮（palette.ts 唯一事实源）', () => {
  it('六色各一：类名取自 palette className，选中包裹 / 无选中插入对', () => {
    for (const color of PALETTE_COLORS) {
      const open = `<mark class="${color.className}">`;
      const r = applyInsert(`color:${color.key}`, '字', 0, 1);
      expect(r.text, color.key).toBe(`${open}字</mark>`);
      expect(r.selStart, color.key).toBe(open.length);
      expect(r.selEnd, color.key).toBe(open.length + 1);

      const empty = applyInsert(`color:${color.key}`, '', 0, 0);
      expect(empty.text, color.key).toBe(`${open}</mark>`);
      expect(empty.selStart, color.key).toBe(open.length);
    }
  });

  it('六色高亮重复触发解除', () => {
    const r = applyInsert('color:teal', '<mark class="c-teal">字</mark>', 21, 22);
    expect(r).toEqual({ text: '字', selStart: 0, selEnd: 1 });
  });

  it('非法 palette 键（防御性）动作忽略，文本原样返回', () => {
    const action = 'color:nope' as ToolbarAction;
    expect(applyInsert(action, '原文', 1, 1)).toEqual({ text: '原文', selStart: 1, selEnd: 1 });
  });

  it('未知动作（防御性）文本原样返回', () => {
    const action = 'bogus' as ToolbarAction;
    expect(applyInsert(action, '原文', 1, 2)).toEqual({ text: '原文', selStart: 1, selEnd: 2 });
  });
});

describe('insertSyntax · 行前缀动作', () => {
  it('无序列表：行首插入 - ', () => {
    const r = applyInsert('list', '待办一\n待办二', 4, 4);
    expect(r).toEqual({ text: '待办一\n- 待办二', selStart: 6, selEnd: 6 });
  });

  it('无序列表：行首为 0 时插入行首', () => {
    const r = applyInsert('list', '第一行', 0, 0);
    expect(r).toEqual({ text: '- 第一行', selStart: 2, selEnd: 2 });
  });

  it('无序列表：行首已有 - 时幂等不重复（文本与选区原样返回）', () => {
    const r = applyInsert('list', '- 已有', 0, 0);
    expect(r).toEqual({ text: '- 已有', selStart: 0, selEnd: 0 });
  });

  it('待办列表：行首插入 - [ ] 并幂等', () => {
    const r = applyInsert('task', '事情', 0, 0);
    expect(r).toEqual({ text: '- [ ] 事情', selStart: 6, selEnd: 6 });
    const again = applyInsert('task', '- [ ] 事情', 6, 6);
    expect(again).toEqual({ text: '- [ ] 事情', selStart: 6, selEnd: 6 });
  });

  it('选区跨行时仅在起始行行首加前缀', () => {
    const r = applyInsert('list', '甲\n乙\n丙', 0, 5);
    expect(r.text).toBe('- 甲\n乙\n丙');
    expect(r.selStart).toBe(2);
    expect(r.selEnd).toBe(7);
  });
});

describe('insertSyntax · 块级公式', () => {
  it('无选中插入 $$\\n\\n$$，光标落在空行', () => {
    const r = applyInsert('blockMath', '正文', 2, 2);
    expect(r).toEqual({ text: '正文$$\n\n$$', selStart: 5, selEnd: 5 });
  });

  it('选中内容被块级公式包裹（多行选区）', () => {
    const r = applyInsert('blockMath', 'a\\sum b', 1, 5);
    expect(r).toEqual({ text: 'a$$\n\\sum\n$$ b', selStart: 4, selEnd: 8 });
  });

  it('块级公式重复触发解除', () => {
    const r = applyInsert('blockMath', '$$\n\\sum\n$$', 3, 7);
    expect(r).toEqual({ text: '\\sum', selStart: 0, selEnd: 4 });
  });
});

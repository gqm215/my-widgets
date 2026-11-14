import { describe, expect, it } from 'vitest';
import {
  isSmartViewKey,
  resolveSelectedTaskId,
  resolveViewKeyFromParam,
  resolveViewParam,
} from '../viewKeys';
import { makeTodo } from '@/test/fixtures';

describe('viewKeys · ?list= 解析（D9，B2-T1 既有函数回归）', () => {
  it('isSmartViewKey 只认三个智能视图键', () => {
    expect(isSmartViewKey('inbox')).toBe(true);
    expect(isSmartViewKey('today')).toBe(true);
    expect(isSmartViewKey('next7')).toBe(true);
    expect(isSmartViewKey('inbox ')).toBe(false);
    expect(isSmartViewKey('l1')).toBe(false);
    expect(isSmartViewKey('')).toBe(false);
  });

  it('resolveViewParam：智能键原样；清单存在原样；清单已删回落 inbox', () => {
    expect(resolveViewParam('today', [])).toBe('today');
    expect(resolveViewParam('l1', ['l1', 'l2'])).toBe('l1');
    expect(resolveViewParam('gone', ['l1'])).toBe('inbox');
  });

  it('resolveViewKeyFromParam：缺失/非法/已删清单回落 inbox，合法值原样', () => {
    expect(resolveViewKeyFromParam(null, [])).toBe('inbox');
    expect(resolveViewKeyFromParam('', ['l1'])).toBe('inbox');
    expect(resolveViewKeyFromParam('bogus', ['l1'])).toBe('inbox');
    expect(resolveViewKeyFromParam('next7', [])).toBe('next7');
    expect(resolveViewKeyFromParam('l1', ['l1'])).toBe('l1');
  });
});

describe('viewKeys · ?task= 解析（D9 + D4）', () => {
  const todos = [
    makeTodo({ id: 't1', title: '顶层任务' }),
    makeTodo({ id: 'p1', title: '父任务' }),
    makeTodo({ id: 's1', title: '子任务', parentId: 'p1' }),
  ];

  it('合法顶层任务 id 原样返回（含首尾空白裁剪）', () => {
    expect(resolveSelectedTaskId('t1', todos)).toBe('t1');
    expect(resolveSelectedTaskId('  t1  ', todos)).toBe('t1');
  });

  it('缺失 / 空白参数回落无选中（null）', () => {
    expect(resolveSelectedTaskId(null, todos)).toBeNull();
    expect(resolveSelectedTaskId(undefined, todos)).toBeNull();
    expect(resolveSelectedTaskId('', todos)).toBeNull();
    expect(resolveSelectedTaskId('   ', todos)).toBeNull();
  });

  it('id 不在集合中（已删除 / 乱写）回落无选中', () => {
    expect(resolveSelectedTaskId('ghost', todos)).toBeNull();
    expect(resolveSelectedTaskId('t9', [])).toBeNull();
  });

  it('指向子任务视为不可选中（D4：子任务仅 title+status，不进详情选中集）', () => {
    expect(resolveSelectedTaskId('s1', todos)).toBeNull();
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import { detectShell, getBridge, resolveBridge } from '@/platform/bridge';

const mocks = vi.hoisted(() => {
  const tauriBridge = {
    shell: 'tauri' as const,
    load: async () => null,
    save: async () => {},
    onChange: () => () => {},
    closeWindow: () => {},
    toggleWidget: () => {},
  };
  return { tauriBridge, createTauriBridge: vi.fn(async () => tauriBridge) };
});

vi.mock('@/platform/tauri', () => ({ createTauriBridge: mocks.createTauriBridge }));

function makeElectronBridge() {
  return {
    shell: 'electron' as const,
    load: vi.fn(async () => null),
    save: vi.fn(async () => {}),
    onChange: vi.fn(() => () => {}),
    closeWindow: vi.fn(),
    toggleWidget: vi.fn(),
  };
}

afterEach(() => {
  delete window.mojiBridge;
  delete window.__TAURI_INTERNALS__;
  mocks.createTauriBridge.mockClear();
});

describe('detectShell / getBridge', () => {
  it('普通浏览器环境是 web，且没有桥', () => {
    expect(detectShell()).toBe('web');
    expect(getBridge()).toBeNull();
  });

  it('存在 preload 注入的桥时识别为 electron', () => {
    window.mojiBridge = makeElectronBridge();
    expect(detectShell()).toBe('electron');
    expect(getBridge()).toBe(window.mojiBridge);
  });

  it('只有 Tauri 运行时标记时识别为 tauri', () => {
    window.__TAURI_INTERNALS__ = {};
    expect(detectShell()).toBe('tauri');
    expect(getBridge()).toBeNull();
  });
});

describe('resolveBridge', () => {
  it('Web 返回 null', async () => {
    await expect(resolveBridge()).resolves.toBeNull();
    expect(mocks.createTauriBridge).not.toHaveBeenCalled();
  });

  it('Electron 直接复用 preload 注入的实例', async () => {
    const bridge = makeElectronBridge();
    window.mojiBridge = bridge;
    await expect(resolveBridge()).resolves.toBe(bridge);
    expect(mocks.createTauriBridge).not.toHaveBeenCalled();
  });

  it('Tauri 用适配层创建，并缓存回 window.mojiBridge', async () => {
    window.__TAURI_INTERNALS__ = {};
    const bridge = await resolveBridge();
    expect(bridge).toBe(mocks.tauriBridge);
    expect(mocks.createTauriBridge).toHaveBeenCalledTimes(1);
    // 缓存后 getBridge 可同步命中，供 Topbar 等 UI 分支使用
    expect(getBridge()).toBe(mocks.tauriBridge);
    expect(detectShell()).toBe('tauri');
  });
});

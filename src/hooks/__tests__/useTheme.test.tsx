import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { setMediaQuery } from '@/test/setup';

function ThemeProbe() {
  const { theme, isDark, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="is-dark">{String(isDark)}</span>
      <button onClick={toggleTheme}>切换主题</button>
    </div>
  );
}

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>
  );
}

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('useTheme', () => {
  it('无保存主题且系统为浅色时使用 light', () => {
    localStorage.clear();
    setMediaQuery('(prefers-color-scheme: dark)', false);
    renderWithTheme();
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('系统为深色且无保存主题时使用 dark', () => {
    localStorage.clear();
    setMediaQuery('(prefers-color-scheme: dark)', true);
    renderWithTheme();
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('localStorage 中的主题优先于系统偏好', () => {
    localStorage.setItem('theme', 'dark');
    setMediaQuery('(prefers-color-scheme: dark)', false);
    renderWithTheme();
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggleTheme 切换主题、class 并持久化', async () => {
    localStorage.clear();
    setMediaQuery('(prefers-color-scheme: dark)', false);
    renderWithTheme();
    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    await userEvent.click(screen.getByRole('button', { name: '切换主题' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: '切换主题' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('在 ThemeProvider 外使用 useTheme 会抛错', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeProbe />)).toThrow('useTheme 必须在 ThemeProvider 内部使用');
  });
});

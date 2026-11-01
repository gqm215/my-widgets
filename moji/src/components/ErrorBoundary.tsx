import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] 捕获到渲染错误:', error);
      console.error('[ErrorBoundary] 组件堆栈:', errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-ink-900 p-8">
          <div className="max-w-md w-full text-center">
            {/* 禅意圆形装饰 */}
            <div className="relative mx-auto mb-10 w-28 h-28">
              <svg
                viewBox="0 0 120 120"
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="text-ink-200 dark:text-ink-700"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="text-vermilion/30"
                  strokeDasharray="8 6"
                  strokeWidth="1.2"
                />
                <circle cx="60" cy="60" r="8" className="text-vermilion" fill="currentColor" />
              </svg>
            </div>

            {/* 标题 */}
            <h2 className="text-2xl font-serif font-semibold text-ink-900 dark:text-ink-100 mb-4">
              墨染残卷
            </h2>

            {/* 描述 */}
            <p className="text-ink-500 dark:text-ink-300 leading-relaxed mb-2">
              页面渲染时出现了意外，如同画卷上的一笔墨渍。
            </p>
            <p className="text-ink-400 dark:text-ink-300 text-sm leading-relaxed mb-10">
              墨集正在努力恢复，请稍后再试。
            </p>

            {/* 重试按钮 */}
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-vermilion hover:bg-vermilion-light text-white rounded-md transition-all duration-300 font-medium shadow-paper hover:shadow-paper-lg"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
              <span>重试</span>
            </button>

            {/* 底部装饰线 */}
            <div className="mt-12 flex items-center justify-center gap-3">
              <span className="block w-8 h-px bg-ink-200 dark:bg-ink-700" />
              <span className="text-xs text-ink-300 dark:text-ink-600 font-serif">墨 集</span>
              <span className="block w-8 h-px bg-ink-200 dark:bg-ink-700" />
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
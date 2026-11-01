import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ui/Toast'
import { PWARegister } from '@/components/PWARegister'
import { flushState } from '@/utils/storage'

// 页面隐藏 / 关闭前立即落盘，避免丢失防抖窗口内（≤300ms）的最后一次修改
const flushPersistedState = () => {
  flushState()
}
window.addEventListener('beforeunload', flushPersistedState)
window.addEventListener('pagehide', flushPersistedState)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushState()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
        <PWARegister />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)

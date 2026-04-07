import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initDbSync } from './store/useAppStore.ts'

// DB 구독 시작 — 앱 렌더 전에 호출하여 초기 Task 로드
initDbSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

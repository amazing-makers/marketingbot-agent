import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// electron-vite (alex8088 정식판) — main/preload/renderer 3개 entry 자동 처리.
// externalizeDepsPlugin: package.json dependencies 를 자동 external (번들에서 제외) 처리.
//                       playwright/electron-store 같은 Node.js 의존을 안전하게 require 시킴.
//
// 출력 위치 (기본):
//   out/main/index.js       — CJS (Electron 메인 호환)
//   out/preload/index.mjs   — ESM (preload 권장)
//   out/renderer/           — Vite SPA 빌드
export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            lib: {
                entry: 'electron/main/index.ts',
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            lib: {
                entry: 'electron/preload/index.ts',
            },
        },
    },
    renderer: {
        // file:// 프로토콜에서 asset 절대경로(/assets/...) 가 system root 로 해석되는 문제 방지.
        // './'로 두면 index.html 기준 상대 경로로 변환됨 — Electron production 환경에서 필수.
        base: './',
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.join(__dirname, 'src'),
            },
        },
        root: '.',
        build: {
            rollupOptions: {
                input: {
                    index: path.join(__dirname, 'index.html'),
                },
            },
        },
    },
})

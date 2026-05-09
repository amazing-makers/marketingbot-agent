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

import react from '@vitejs/plugin-react'
import jotaiDebugLabel from 'jotai-babel/plugin-debug-label'
import jotaiReactRefresh from 'jotai-babel/plugin-react-refresh'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react({ babel: { plugins: [jotaiDebugLabel, jotaiReactRefresh] } })],
    build: {
      minify: 'oxc',
      outDir: 'build',
      sourcemap: false,
      rolldownOptions: {
        output: {
          minify:
            mode === 'development'
              ? true
              : {
                  compress: {
                    dropConsole: true,
                    dropDebugger: true,
                  },
                },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
  }
})

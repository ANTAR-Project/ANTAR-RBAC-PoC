import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendTarget = process.env.VITE_BACKEND_URL || 'http://auth-service:8085'
const simulatorTarget = process.env.VITE_SIMULATOR_URL || 'http://iot-simulator:5050'

const redirectPlugin = () => ({
  name: 'redirect-legacy-urls',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url.split('?')[0]
      if (url === '/test-auth.html' || url === '/test-auth' || url === '/test-auth-legacy.html') {
        res.writeHead(302, { Location: '/' })
        res.end()
        return
      }
      next()
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), redirectPlugin()],
  server: {
    port: 5500,
    host: '0.0.0.0',
    strictPort: true,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true
      },
      '/auth': {
        target: backendTarget,
        changeOrigin: true
      },
      '/webauthn': {
        target: backendTarget,
        changeOrigin: true
      },
      '/devices-api': {
        target: simulatorTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/devices-api/, '')
      }
    }
  }
})

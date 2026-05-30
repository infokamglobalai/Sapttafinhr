import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server sits behind the nginx front door (see deploy/nginx.conf),
// reached as both http://localhost:8080 and http://{workspace}.localhost:8080.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,            // listen on 0.0.0.0 (reachable from the nginx container)
    port: 5173,
    // Allow the proxied Host headers (Vite 5 blocks unknown hosts otherwise).
    allowedHosts: ['localhost', '.localhost'],
    // HMR websocket must connect back through nginx on :8080.
    hmr: { clientPort: 8080 },
  },
})

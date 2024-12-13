import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api/v1/users': {
          target: env.VITE_USERS_SERVICE_URL,
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/telegramUsers': {
          target: env.VITE_USERS_SERVICE_URL,
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/teams': {
          target: env.VITE_TEAMS_SERVICE_URL,
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/maps': {
          target: env.VITE_MAPS_SERVICE_URL,
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/missions': {
          target: env.VITE_MISSIONS_SERVICE_URL,
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/messenger': {
          target: env.VITE_MESSENGER_SERVICE_URL,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: env.VITE_BACKEND_URL,
          ws: true,
          changeOrigin: true,
          secure: false,
        }
      },
    },
    define: {
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY),
      'import.meta.env.VITE_AUTH_DOMAIN': JSON.stringify(env.VITE_AUTH_DOMAIN),
      'import.meta.env.VITE_PROJECT_ID': JSON.stringify(env.VITE_PROJECT_ID),
      'import.meta.env.VITE_STORAGE_BUCKET': JSON.stringify(env.VITE_STORAGE_BUCKET),
      'import.meta.env.VITE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_APP_ID': JSON.stringify(env.VITE_APP_ID),
    }
  }
})
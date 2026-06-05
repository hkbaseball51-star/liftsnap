import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.repra.workout',
  appName: 'REPRA',
  webDir: 'public',
  server: {
    // Live URL — the iOS WebView loads the production Next.js app directly.
    // The public/index.html is only a placeholder to satisfy `cap sync`.
    url: 'https://repraworkout.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#080808',
  },
}

export default config

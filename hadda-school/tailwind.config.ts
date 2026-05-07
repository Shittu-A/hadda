// Tailwind CSS v4 — configuration is done via CSS @theme in app/globals.css
// This file is kept for tooling compatibility only
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config

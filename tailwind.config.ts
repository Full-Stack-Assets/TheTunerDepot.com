import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Dark automotive palette: "ink" is the foreground (chalk white) and
        // "paper" the asphalt background — semantic names kept so existing
        // text-ink / bg-paper utilities keep reading correctly site-wide.
        ink: '#f2f1ee',
        paper: '#101114',
        carbon: '#1c1f24',
        accent: '#ff5b1f',
        muted: '#a3a3ab',
        rule: '#2a2d33',
        // Intermediate zinc shade used by the VaporLoop demo (/vaporloop)
        'zinc-850': '#1f1f23',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        apple: {
          blue:   "hsl(211 100% 50%)",
          indigo: "hsl(239 83% 60%)",
          purple: "hsl(285 55% 56%)",
          pink:   "hsl(349 100% 60%)",
          red:    "hsl(0 100% 50%)",
          orange: "hsl(28 100% 52%)",
          yellow: "hsl(47 100% 50%)",
          green:  "hsl(133 61% 41%)",
          teal:   "hsl(184 72% 44%)",
        },
        neutral: {
          50:  "#f9f9fb",
          100: "#f2f2f7",
          200: "#e5e5ea",
          300: "#d1d1d6",
          400: "#aeaeb2",
          500: "#8e8e93",
          600: "#636366",
          700: "#48484a",
          800: "#3a3a3c",
          900: "#2c2c2e",
          950: "#1c1c1e",
        },
      },
      borderRadius: {
        xs:    "6px",
        sm:    "10px",
        DEFAULT: "13px",
        md:    "13px",
        lg:    "16px",
        xl:    "20px",
        "2xl": "28px",
        "3xl": "36px",
      },
      boxShadow: {
        "apple-sm": "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "apple-md": "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        "apple-lg": "0 8px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)",
        "apple-xl": "0 24px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)",
      },
      transitionTimingFunction: {
        "spring":     "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "apple-ease": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
      },
      fontFamily: {
        sans: [
          "Inter", "-apple-system", "BlinkMacSystemFont",
          "SF Pro Display", "SF Pro Text",
          "Helvetica Neue", "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

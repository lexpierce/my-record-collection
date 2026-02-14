/**
 * PostCSS configuration for Tailwind CSS v4
 * Uses the new @tailwindcss/postcss plugin
 * @type {import('postcss-load-config').Config}
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};

export default config;

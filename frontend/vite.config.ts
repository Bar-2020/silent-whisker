import { defineConfig } from 'vite-plus';

export default defineConfig({
  css: {
    transformer: 'lightningcss',
    // The widths are named once, in src/styles/breakpoints.css.
    lightningcss: { drafts: { customMedia: true } },
  },
});

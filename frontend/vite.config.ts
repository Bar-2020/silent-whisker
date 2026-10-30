import { defineConfig } from 'vite-plus';

export default defineConfig({
  // The folder aliases are the `paths` of the root tsconfig.json.
  resolve: { tsconfigPaths: true },
  css: {
    transformer: 'lightningcss',
    // The widths are named once, in src/styles/breakpoints.css.
    lightningcss: { drafts: { customMedia: true } },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src/lib/**/*", "src/extensions/**/*"],
      outDir: "dist",
      rollupTypes: true,
    }),
    {
      name: "copy-css",
      closeBundle() {
        // Copy the CSS file to dist after build
        copyFileSync(
          resolve(__dirname, "src/index.css"),
          resolve(__dirname, "dist/styles.css"),
        );
        console.log("✓ Copied styles.css to dist/");
      },
    },
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/lib/index.ts"),
      name: "DeditReactEditor",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@tiptap/react",
        "@tiptap/core",
        "@tiptap/pm",
        "@tiptap/pm/state",
        "@tiptap/pm/transform",
        "@tiptap/pm/view",
        "@tiptap/pm/model",
        "@tiptap/extension-document",
        "@tiptap/extension-paragraph",
        "@tiptap/extension-text",
        "@tiptap/extension-heading",
        "@tiptap/extension-bold",
        "@tiptap/extension-italic",
        "@tiptap/extension-table",
        "@tiptap/extension-table-row",
        "@tiptap/extension-table-cell",
        "@tiptap/extension-table-header",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "@tiptap/react": "TiptapReact",
          "@tiptap/core": "TiptapCore",
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
});

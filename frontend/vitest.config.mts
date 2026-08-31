import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests for the logic that does not need a browser: money arithmetic, the
 * redirect guard, plural agreement. Rendering is covered by the typecheck and
 * the build; what is here is the reasoning underneath it, which is where a
 * mistake is both easiest to make and quietest to miss.
 */
export default defineConfig({
  test: {
    // Node, not jsdom: nothing under test touches the DOM, and a DOM would only
    // slow the run and invite tests that drift into rendering.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'], // load jest-dom types and matchers
    // Set to false to always show console logs
    silent: false,
    // Or completely disable console interception
    disableConsoleIntercept: true,
    // Show stack traces for console logs (if using a compatible Vitest version)
    printConsoleTrace: true,
  }
});

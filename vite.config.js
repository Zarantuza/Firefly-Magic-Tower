import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      // Use chokidar for more granular control over file watching
      usePolling: true, // Useful for Docker environments or VM setups
    },
    hmr: {
      overlay: true, // Show HMR overlay for errors
    },
  },
});
// Usa o Google Chrome do sistema; roda headless com --no-sandbox no container.
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 20000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    channel: 'chrome',
    headless: true,
    launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] }
  }
});

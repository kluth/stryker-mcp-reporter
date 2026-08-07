import { chromium } from 'playwright';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  // Start static server
  const app = express();
  app.use(express.static(path.join(__dirname, 'public')));
  
  const server = app.listen(0, async () => {
    const port = server.address().port;
    try {
      const browser = await chromium.launch();
      const page = await browser.newPage();
      
      // Navigate to Dashboard
      await page.goto(`http://localhost:${port}/index.html`);
      await page.waitForTimeout(2000); // wait for load
      await page.screenshot({ path: 'docs/dashboard.png', fullPage: true });

      // Navigate to History
      await page.goto(`http://localhost:${port}/history.html`);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'docs/history.png', fullPage: true });

      // Navigate to Explorer
      await page.goto(`http://localhost:${port}/explorer.html`);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'docs/explorer.png', fullPage: true });

      await browser.close();
      console.log('Screenshots saved to docs/');
    } catch (e) {
      console.error(e);
    } finally {
      server.close();
      process.exit(0);
    }
  });
})();

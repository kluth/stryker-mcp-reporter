import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to Dashboard
  await page.goto('http://localhost:3000/index.html');
  await page.waitForTimeout(2000); // wait for load
  await page.screenshot({ path: 'docs/dashboard.png', fullPage: true });

  // Navigate to History
  await page.goto('http://localhost:3000/history.html');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/history.png', fullPage: true });

  // Navigate to Explorer
  await page.goto('http://localhost:3000/explorer.html');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/explorer.png', fullPage: true });

  await browser.close();
  console.log('Screenshots saved to docs/');
})();

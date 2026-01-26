import { test, expect } from '@playwright/test';
import path from 'path';

test('Manual process input → smart alphabetical search on processchecker', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1️⃣ Open local UI
  const localHtml = path.join(__dirname, '..', 'ui', 'index.html');
  await page.goto(`file://${localHtml}`);
  console.log('🟢 Local UI opened. Type your process name.');

  // 2️⃣ Pause for manual typing
  await page.pause(); // Type process name in the Playwright browser input

  // 3️⃣ Read typed process name
  const processName = (await page.inputValue('#processName')).trim();
  if (!processName) throw new Error('❌ No process name entered!');
  console.log(`🔍 Process detected: ${processName}`);

  // 4️⃣ Detect first letter
  const firstLetter = processName[0].toUpperCase();
  let pageNumber = 1;
  const maxPages = 10000; // high max just in case
  let found = false;

  console.log(`🔠 Starting search on "${firstLetter}" page...`);

  while (pageNumber <= maxPages) {
    const url =
      pageNumber === 1
        ? `https://processchecker.com/file.php?start=${firstLetter}`
        : `https://processchecker.com/file.php?start=${firstLetter}&page=${pageNumber}`;
    console.log(`📄 Checking page ${pageNumber}: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Get all processes on this page
    const processes = (await page.locator('a').allTextContents()).map(p => p.trim());
    if (processes.length === 0) {
      console.log('ℹ️ No processes on this page');
      break;
    }

    const firstProcess = processes[0];
    const lastProcess = processes[processes.length - 1];

    // If process comes before first → stop
    if (processName.localeCompare(firstProcess) < 0) {
      console.log('❌ Process would appear before this page → not found');
      break;
    }

    // If process comes after last → continue next page
    if (processName.localeCompare(lastProcess) > 0) {
      pageNumber++;
      continue;
    }

    // Target is within this page → search exact
    const processLink = page.locator('a', { hasText: processName });
    if (await processLink.count() > 0) {
      console.log(`✅ Found "${processName}" on page ${pageNumber}`);
      await processLink.first().click();
      await page.waitForLoadState('domcontentloaded');
      found = true;
      break;
    }

    console.log('ℹ️ Process in range but not on this page → next page');
    pageNumber++;
  }

  if (!found) throw new Error(`❌ Process "${processName}" not found!`);

  // Assert we are on detail page
  expect(page.url()).not.toContain('file.php?start=');
  console.log('🎉 Process detail page opened successfully!');
});

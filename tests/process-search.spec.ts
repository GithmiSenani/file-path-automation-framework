import { test, expect } from '@playwright/test';

test('Search process name until found (pagination)', async ({ page }) => {
  // STEP 1: Process name
  const processName = (process.env.PROCESS_NAME || 'notepad.exe').trim();
  if (!processName) throw new Error('PROCESS_NAME is required');

  const firstLetter = processName[0].toLowerCase();
  const baseUrl = `https://processchecker.com/file.php?start=${firstLetter}`;

  console.log(`🔍 Searching for: ${processName}`);

  let pageNumber = 1;
  const maxPages = 100;
  let found = false;

  while (pageNumber <= maxPages) {
    const url = `${baseUrl}&page=${pageNumber}`;
    console.log(`📄 Checking page ${pageNumber}: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // STEP 2: Look for the process link on the page
    const processLink = page.locator('a', {
      hasText: processName,
    });

    if (await processLink.count() > 0) {
      console.log(`✅ Found "${processName}" on page ${pageNumber}`);

      // STEP 3: Click the process
      await processLink.first().click();
      await page.waitForLoadState('domcontentloaded');

      found = true;
      break;
    }

    // STEP 4: Check if there is a next page
    const nextPageExists =
      (await page.locator('a:has-text("Next")').count()) > 0 ||
      (await page.locator(`a[href*="page=${pageNumber + 1}"]`).count()) > 0;

    if (!nextPageExists) {
      console.log('ℹ️ No more pages available');
      break;
    }

    pageNumber++;
  }

  // STEP 5: Final assertion
  if (!found) {
    throw new Error(`❌ Process "${processName}" not found after ${pageNumber} pages`);
  }

  // Confirm we are on detail page
  expect(page.url()).not.toContain('file.php?start=');
  console.log('🎉 Process detail page opened successfully');
});

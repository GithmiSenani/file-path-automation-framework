import { test, expect } from '@playwright/test';

// Feature: Automate Process Name Checking
// Scenario: Verify a process name automatically
// Usage:
//  - Default (example): npx playwright test tests/process-checker.spec.ts
//  - To test a specific process: set env vars before running the test:
//      PROCESS_NAME=notepad.exe PROCESS_FIRST_LETTER=n npm run test

test('Verify a process exists on processchecker', async ({ page }) => {
  const defaultProcess = 'notepad.exe';
  const processName = (process.env.PROCESS_NAME ?? defaultProcess).trim();
  const firstLetter = (process.env.PROCESS_FIRST_LETTER ?? processName[0] ?? '').toLowerCase();

  if (!firstLetter) {
    throw new Error('First letter could not be determined. Set PROCESS_FIRST_LETTER or PROCESS_NAME.');
  }

  const baseUrl = `https://processchecker.com/file.php?start=${encodeURIComponent(firstLetter)}`;
  const maxPages = 50; // safety cap
  let found = false;
  let foundPage = -1;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = `${baseUrl}&page=${pageNum}`;
    console.log(`Visiting: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const content = (await page.content()).toLowerCase();
    const needle = processName.toLowerCase();

    if (content.includes(needle)) {
      found = true;
      foundPage = pageNum;
      console.log(`Found "${processName}" on page ${pageNum}`);
      break;
    }

    // Heuristic: detect an empty result or last page to stop early
    if (
      content.includes('no entries') ||
      content.includes('no results') ||
      content.includes('nothing found') ||
      content.includes('no files') ||
      content.includes('not found')
    ) {
      console.log('Detected end of results or no entries on this page. Stopping search.');
      break;
    }

    // Also try to detect if there's no next page link by searching for 'page=' patterns
    // If the page HTML doesn't contain further page links, stop.
    const hasFurtherPages = /page=\d+/i.test(content);
    if (!hasFurtherPages) {
      console.log('No pagination links detected on page; stopping search.');
      break;
    }
  }

  if (found) {
    // Assert true so test passes when process exists
    expect(found).toBeTruthy();
  } else {
    // Fail the test to indicate the process was not found
    throw new Error(`Process "${processName}" not found starting at ${baseUrl} (checked up to ${maxPages} pages).`);
  }
});

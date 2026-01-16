import { test, expect } from '@playwright/test';

/**
 * Playwright Automation Script to Search for Process on processchecker.com
 * 
 * Requirements:
 * 1. Accept a process name as input
 * 2. Open the website page for the first letter of the process name
 * 3. Loop through all pages (pagination) until the process name is found
 * 4. Click on the process name to open the detail page
 * 5. Stop once the process is found and navigated
 * 6. Handle case where process is not found
 * 
 * Usage:
 *   PROCESS_NAME=notepad.exe npx playwright test tests/process-search.spec.ts
 *   PROCESS_NAME=svchost.exe npx playwright test tests/process-search.spec.ts --project=chromium
 */

test('Search for a process on processchecker.com', async ({ page }) => {
  // ============================================
  // STEP 1: Get the process name from environment or use default
  // ============================================
  const processName = (process.env.PROCESS_NAME || 'notepad.exe').trim();
  console.log(`\n🔍 Searching for process: ${processName}\n`);

  if (!processName) {
    throw new Error('Process name is required. Set PROCESS_NAME environment variable.');
  }

  // ============================================
  // STEP 2: Extract the first letter and build the base URL
  // ============================================
  const firstLetter = processName[0].toLowerCase();
  const baseUrl = `https://processchecker.com/file.php?start=${encodeURIComponent(firstLetter)}`;
  console.log(`📄 Base URL: ${baseUrl}\n`);

  // ============================================
  // STEP 3: Configuration for pagination loop
  // ============================================
  const maxPages = 100; // Safety limit to prevent infinite loops
  let currentPage = 1;
  let processFound = false;
  let detailUrl = null;

  // ============================================
  // STEP 4: Loop through pages until process is found
  // ============================================
  while (currentPage <= maxPages && !processFound) {
    const pageUrl = `${baseUrl}&page=${currentPage}`;
    console.log(`⏳ Page ${currentPage}: ${pageUrl}`);

    try {
      // Navigate to the current page
      await page.goto(pageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for page content to load
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('   ⚠️  Network idle timeout (non-critical, continuing...)');
      });

      // ============================================
      // STEP 5: Search for the process name on the current page
      // ============================================
      // Get all links on the page and check if any contain the process name
      const links = await page.locator('a').all();
      console.log(`   Found ${links.length} links on this page`);

      for (const link of links) {
        const linkText = await link.textContent();
        const href = await link.getAttribute('href');

        if (linkText && linkText.toLowerCase().includes(processName.toLowerCase())) {
          console.log(`\n✅ Found process link: "${linkText}"`);
          console.log(`   Link URL: ${href}\n`);

          detailUrl = href;
          processFound = true;

          // ============================================
          // STEP 6: Click on the process to open detail page
          // ============================================
          console.log('🖱️  Clicking on the process link...');
          await link.click();

          // Wait for the detail page to load
          await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
          console.log('✅ Detail page loaded');

          break; // Exit the link search loop
        }
      }

      if (!processFound) {
        console.log(`   ❌ Process not found on page ${currentPage}\n`);

        // ============================================
        // STEP 7: Check for pagination indicators
        // ============================================
        // Look for "next page" button or links to detect if there are more pages
        const hasNextPage = await page.locator('a:has-text("next"), a:has-text("Next"), a[rel="next"]').count() > 0;
        const pageContent = await page.content();
        const hasPageLinks = /page=\d+/i.test(pageContent);

        if (!hasNextPage && !hasPageLinks) {
          console.log('   ℹ️  No more pages available. Stopping search.\n');
          break;
        }

        currentPage++;
      }
    } catch (error) {
      console.error(`   ❌ Error on page ${currentPage}:`, error);
      break;
    }
  }

  // ============================================
  // STEP 8: Handle results
  // ============================================
  if (processFound) {
    console.log(`🎉 Success! Process "${processName}" found and detail page opened.`);
    console.log(`   Current URL: ${page.url()}\n`);

    // ============================================
    // STEP 9: Optional - Extract details from the detail page
    // ============================================
    const pageTitle = await page.title();
    const bodyText = await page.textContent('body');

    console.log(`📋 Detail Page Title: ${pageTitle}`);

    // Extract file path (Windows format: C:\path\to\file.exe)
    const pathMatch = bodyText?.match(/[A-Za-z]:\\[^\s<>"']+/);
    if (pathMatch) {
      console.log(`📁 File Path: ${pathMatch[0]}`);
    }

    // Extract product name (look for "Product Name:" or "Company:")
    const productMatch = bodyText?.match(/Product\s*Name\s*[:\-]\s*([^\n<]+)/i);
    const companyMatch = bodyText?.match(/Company\s*[:\-]\s*([^\n<]+)/i);

    if (productMatch) {
      console.log(`📦 Product Name: ${productMatch[1].trim()}`);
    }
    if (companyMatch) {
      console.log(`🏢 Company: ${companyMatch[1].trim()}\n`);
    }

    // Assertion: verify we're on a detail page
    expect(page.url()).not.toContain('file.php?start=');
    console.log('✅ Test passed: Process found and detail page loaded\n');
  } else {
    // ============================================
    // STEP 10: Handle "not found" case
    // ============================================
    console.log(`❌ Process "${processName}" was NOT found after checking ${currentPage - 1} pages.`);
    console.log(`   Searched on: ${baseUrl}\n`);

    // Fail the test if process not found
    throw new Error(`Process "${processName}" not found on processchecker.com (checked ${currentPage - 1} pages)`);
  }
});

/**
 * Alternative: Simpler synchronous search (single page check)
 * Use this if you just want to check if the process exists on the first-letter page
 */
test('Quick check - search on first page only', async ({ page }) => {
  const processName = (process.env.PROCESS_NAME || 'notepad.exe').trim();
  const firstLetter = processName[0].toLowerCase();
  const url = `https://processchecker.com/file.php?start=${encodeURIComponent(firstLetter)}`;

  console.log(`\n🔍 Quick check for: ${processName}`);

  // Navigate to the page
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Search for the process name in all links
  const found = await page.locator(`a:has-text("${processName}")`).count() > 0;

  if (found) {
    console.log(`✅ Found on first page!`);
    // Click the first matching link
    await page.locator(`a:has-text("${processName}")`).first().click();
    await page.waitForLoadState('domcontentloaded');
  } else {
    console.log(`❌ Not found on first page`);
  }

  expect(found).toBeTruthy();
});

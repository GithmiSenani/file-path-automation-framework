/**
 * FAST Process Searcher for processchecker.com
 * 
 * This is a Node.js script (NOT a Playwright test) that searches for processes quickly
 * Why it's fast:
 * - Single browser instance (chromium only, not all 3 browsers)
 * - No test framework overhead
 * - Direct Playwright API calls
 * - Optimized timeouts
 * - Headless mode (no UI rendering)
 * 
 * Usage:
 *   node search-process.js notepad.exe
 *   node search-process.js svchost.exe
 *   PROCESS_NAME=explorer.exe node search-process.js
 */

const { chromium } = require('playwright');

async function searchProcess(processName) {
  if (!processName) {
    console.error('❌ Error: Process name required');
    console.error('Usage: node search-process.js <process_name>');
    console.error('Example: node search-process.js notepad.exe');
    process.exit(1);
  }

  let browser;
  try {
    console.log(`\n🚀 Starting fast process search for: ${processName}\n`);
    const startTime = Date.now();

    // Launch browser (FAST: single chromium instance, headless)
    console.log('📱 Launching browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Extract first letter and build URL
    const firstLetter = processName[0].toLowerCase();
    const baseUrl = `https://processchecker.com/file.php?start=${encodeURIComponent(firstLetter)}`;
    console.log(`📄 Starting from: ${baseUrl}\n`);

    // Search configuration
    const maxPages = 100;
    let found = false;
    let pagesChecked = 0;

    // Loop through pages
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      // First page doesn't have &page=1, subsequent pages have &page=2, &page=3, etc.
      const url = pageNum === 1 ? baseUrl : `${baseUrl}&page=${pageNum}`;
      pagesChecked = pageNum;

      // Show progress
      process.stdout.write(`\r⏳ Checking page ${pageNum}...`);

      try {
        // Navigate with SHORT timeout (FAST)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Get all link texts
        const links = await page.$$eval('a', els => 
          els.map(a => ({ text: a.textContent.trim(), href: a.href }))
        );

        // Search for process name (exact match first, then partial match)
        let matchedLink = links.find(link => 
          link.text && link.text.toLowerCase() === processName.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!matchedLink) {
          matchedLink = links.find(link => 
            link.text && link.text.toLowerCase().includes(processName.toLowerCase())
          );
        }

        if (matchedLink) {
          console.log(`\n\n✅ Found on page ${pageNum}: "${matchedLink.text}"\n`);
          found = true;

          // Click the link
          console.log('🖱️  Clicking process link...');
          await page.click(`a:has-text("${matchedLink.text.substring(0, 20)}")`).catch(() => {
            // Fallback: navigate directly if click fails
            return page.goto(matchedLink.href);
          });

          // Wait for detail page
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

          // Extract file path
          const bodyText = await page.textContent('body');
          const pathMatch = bodyText?.match(/[A-Za-z]:\\[^\s<>"']+/);
          const productMatch = bodyText?.match(/Product\s*Name\s*[:\-]\s*([^\n<]+)/i);

          console.log(`\n📋 Detail Page Information:`);
          if (pathMatch) console.log(`   📁 File Path: ${pathMatch[0]}`);
          if (productMatch) console.log(`   📦 Product: ${productMatch[1].trim()}`);
          console.log(`   🔗 URL: ${page.url()}`);
          
          break;
        }

        // Check if more pages exist
        const pageContent = await page.content();
        if (!pageContent.includes('page=') || pageContent.toLowerCase().includes('no entries')) {
          console.log(`\n\n⚠️  No more pages available\n`);
          break;
        }

      } catch (err) {
        if (err.message.includes('net::ERR_INTERNET_DISCONNECTED')) {
          console.log(`\n\n❌ Network error. Stopping.\n`);
          break;
        }
      }
    }

    if (!found) {
      console.log(`\n\n❌ NOT FOUND after checking ${pagesChecked} pages\n`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Total time: ${elapsed}s\n`);

    await browser.close();
    process.exit(found ? 0 : 1);

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (browser) await browser.close();
    process.exit(1);
  }
}

// Get process name from command line argument or env var
const processName = process.argv[2] || process.env.PROCESS_NAME || 'notepad.exe';
searchProcess(processName);

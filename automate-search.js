/**
 * Complete Process Search Automation
 * 
 * This script:
 * 1. Takes a process name as input
 * 2. Opens processchecker.com with the first letter
 * 3. Searches page by page for the exact process name
 * 4. Clicks on it when found
 * 5. Extracts file path, product name, company info
 * 
 * Usage: node automate-search.js explorer.exe
 */

const { chromium } = require('playwright');

async function searchProcessAutomated(processName) {
  if (!processName) {
    console.error('❌ Error: Process name required');
    console.error('Usage: node automate-search.js <process_name>');
    console.error('Example: node automate-search.js explorer.exe');
    process.exit(1);
  }

  processName = processName.trim();
  let browser;

  try {
    console.log(`\n🚀 Starting automated search for: "${processName}"\n`);
    const startTime = Date.now();

    // Launch browser (visible)
    console.log('📱 Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 300 // Slow down so you can see what's happening
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();

    // Step 1: Get first letter and build URL
    const firstLetter = processName[0].toUpperCase();
    const baseUrl = `https://processchecker.com/file.php?start=${firstLetter}`;
    
    console.log(`📄 Starting from: ${baseUrl}`);
    console.log(`🔍 Searching for: "${processName}"\n`);

    // Step 2: Search through pages
    const maxPages = 100;
    let found = false;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      // Build URL: page 1 has no &page=, page 2+ has &page=2, &page=3, etc.
      const url = pageNum === 1 ? baseUrl : `${baseUrl}&page=${pageNum}`;
      
      console.log(`📄 Page ${pageNum}: ${url}`);

      try {
        // Navigate to page
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000); // Wait for content to load

        // Get all process links on the page
        const links = await page.$$eval('a', els => 
          els.map(a => ({ 
            text: a.textContent.trim(), 
            href: a.href 
          })).filter(link => link.text && link.text.length > 0)
        );

        console.log(`   📊 Found ${links.length} links on this page`);

        // Search for EXACT match first (case-insensitive)
        let matchedLink = links.find(link => 
          link.text.toLowerCase() === processName.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!matchedLink) {
          matchedLink = links.find(link => 
            link.text.toLowerCase().includes(processName.toLowerCase())
          );
        }

        if (matchedLink) {
          console.log(`\n✅ FOUND: "${matchedLink.text}" on page ${pageNum}!\n`);
          found = true;

          // Step 3: Click on the process
          console.log('🖱️  Clicking on the process link...');
          
          try {
            await page.click(`a:has-text("${matchedLink.text}")`);
          } catch (e) {
            // If click fails, navigate directly
            await page.goto(matchedLink.href);
          }
          
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
          await page.waitForTimeout(2000);

          // Step 4: Extract information from detail page
          console.log(`\n📋 Process Details:`);
          console.log(`   🔗 URL: ${page.url()}`);
          
          const bodyText = await page.textContent('body');
          
          // Extract file path
          const pathMatch = bodyText?.match(/[A-Za-z]:\\[^\s<>"'\n]+/);
          if (pathMatch) {
            console.log(`   📁 File Path: ${pathMatch[0]}`);
          } else {
            console.log(`   📁 File Path: Not found`);
          }
          
          // Extract product name
          const productMatch = bodyText?.match(/Product\s*Name\s*[:\-]\s*([^\n<]+)/i);
          if (productMatch) {
            console.log(`   📦 Product: ${productMatch[1].trim()}`);
          } else {
            console.log(`   📦 Product: Not found`);
          }

          // Extract company
          const companyMatch = bodyText?.match(/Company\s*[:\-]\s*([^\n<]+)/i);
          if (companyMatch) {
            console.log(`   🏢 Company: ${companyMatch[1].trim()}`);
          } else {
            console.log(`   🏢 Company: Not found`);
          }
          
          console.log('\n✨ Search completed! Browser will stay open for 15 seconds...\n');
          await page.waitForTimeout(15000);
          
          break;
        } else {
          console.log(`   ❌ "${processName}" not found on page ${pageNum}`);
        }

        // Small delay between pages
        await page.waitForTimeout(500);

      } catch (err) {
        console.log(`   ⚠️  Error on page ${pageNum}: ${err.message}`);
        if (err.message.includes('Timeout')) {
          console.log(`   ⏭️  Skipping to next page...`);
          continue;
        }
        break;
      }
    }

    if (!found) {
      console.log(`\n❌ Process "${processName}" NOT FOUND after checking ${maxPages} pages\n`);
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

// Get process name from command line
const processName = process.argv[2] || '';
searchProcessAutomated(processName);

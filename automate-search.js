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
const path = require('path');

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
      headless: false
      // Removed slowMo for faster execution
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
        // Navigate to page (faster timeout)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        // Removed unnecessary wait - page is ready after domcontentloaded

        // Get all process links on the page (only .exe files)
        const links = await page.$$eval('a', els => 
          els.map(a => ({ 
            text: a.textContent.trim(), 
            href: a.href 
          }))
          .filter(link => 
            link.text && 
            link.text.length > 0 && 
            link.text.toLowerCase().endsWith('.exe') &&
            !link.text.toLowerCase().includes('processchecker')
          )
        );

        console.log(`   📊 Found ${links.length} process links on this page`);

        if (links.length === 0) {
          console.log(`   ⚠️  No process links found, moving to next page...`);
          continue;
        }

        // Check alphabetical range (but don't skip - just for info)
        const firstProcess = links[0].text.toLowerCase();
        const lastProcess = links[links.length - 1].text.toLowerCase();
        const searchName = processName.toLowerCase();

        console.log(`   📝 Range: "${links[0].text}" to "${links[links.length - 1].text}"`);

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
          
          await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
          // Removed unnecessary wait - extract info immediately

          // Step 4: Extract information from detail page
          console.log(`\n📋 Process Details:`);
          console.log(`   🔗 URL: ${page.url()}`);
          
          // Extract detailed information from the page
          const extractedData = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            
            // Extract file path
            const pathMatch = bodyText.match(/[A-Za-z]:\\[^\s<>"'\n]+/);
            
            // Extract product name
            const productMatch = bodyText.match(/Product\s*Name\s*[:\-]\s*([^\n<]+)/i);
            
            // Extract company/vendor
            const companyMatch = bodyText.match(/(?:Company|Vendor)\s*[:\-]\s*([^\n<]+)/i);
            
            // Extract description
            const descMatch = bodyText.match(/Description\s*[:\-]\s*([^\n<]+)/i);
            
            // Extract version
            const versionMatch = bodyText.match(/(?:Version|File\s*Version)\s*[:\-]\s*([^\n<]+)/i);
            
            return {
              filePath: pathMatch ? pathMatch[0] : 'Not found',
              product: productMatch ? productMatch[1].trim() : 'Not found',
              company: companyMatch ? companyMatch[1].trim() : 'Not found',
              description: descMatch ? descMatch[1].trim() : 'Not found',
              version: versionMatch ? versionMatch[1].trim() : 'Not found'
            };
          });
          
          console.log(`   📁 File Path: ${extractedData.filePath}`);
          console.log(`   📦 Product: ${extractedData.product}`);
          console.log(`   🏢 Company/Vendor: ${extractedData.company}`);
          console.log(`   📝 Description: ${extractedData.description}`);
          console.log(`   🔢 Version: ${extractedData.version}`);
          
          // Open results page with extracted data
          console.log('\n📊 Opening results page...\n');
          const resultsPath = path.join(__dirname, 'ui', 'results.html');
          const resultsUrl = `file:///${resultsPath.replace(/\\/g, '/')}?` + 
            `name=${encodeURIComponent(matchedLink.text)}` +
            `&filePath=${encodeURIComponent(extractedData.filePath)}` +
            `&product=${encodeURIComponent(extractedData.product)}` +
            `&company=${encodeURIComponent(extractedData.company)}` +
            `&description=${encodeURIComponent(extractedData.description)}` +
            `&version=${encodeURIComponent(extractedData.version)}` +
            `&url=${encodeURIComponent(page.url())}` +
            `&page=${pageNum}`;
          
          await page.goto(resultsUrl);
          
          console.log('✨ Search completed! Review the results table...\n');
          console.log('📌 Browser will stay open. Close it when done.\n');
          
          // Keep browser open - don't close automatically
          await new Promise(() => {}); // Wait forever until manually closed
          
          break;
        } else {
          console.log(`   ❌ "${processName}" not found on page ${pageNum}`);
        }

        // Removed delay between pages for faster execution

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

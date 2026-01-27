/**
 * INTERACTIVE Process Searcher for processchecker.com
 * 
 * This script will:
 * 1. Prompt you to enter a process name
 * 2. Extract the first letter (e.g., "Notepad" → "N")
 * 3. Go to https://processchecker.com/file.php?start=N
 * 4. Search page 1, then page 2, page 3... until found
 * 
 * Usage:
 *   node search-interactive.js
 */

const { chromium } = require('playwright');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function searchProcess(processName) {
  if (!processName || processName.trim() === '') {
    console.error('❌ Error: Process name cannot be empty');
    return;
  }

  processName = processName.trim();
  let browser;
  
  try {
    console.log(`\n🚀 Starting search for: ${processName}\n`);
    const startTime = Date.now();

    // Launch browser
    console.log('📱 Launching browser...');
    browser = await chromium.launch({ 
      headless: false, // Show browser so you can see what's happening
      slowMo: 100 // Slow down a bit so you can see
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Extract first letter and build URL
    const firstLetter = processName[0].toUpperCase();
    const baseUrl = `https://processchecker.com/file.php?start=${firstLetter}`;
    console.log(`📄 Starting from: ${baseUrl}`);
    console.log(`🔍 Searching for: "${processName}"\n`);

    // Search configuration
    const maxPages = 100;
    let found = false;
    let pagesChecked = 0;

    // Loop through pages
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      // First page: https://processchecker.com/file.php?start=N
      // Page 2: https://processchecker.com/file.php?start=N&page=2
      // Page 3: https://processchecker.com/file.php?start=N&page=3
      const url = pageNum === 1 ? baseUrl : `${baseUrl}&page=${pageNum}`;
      pagesChecked = pageNum;

      // Show progress
      console.log(`📄 Checking page ${pageNum}: ${url}`);

      try {
        // Navigate to page
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Get all process links on the page
        const links = await page.$$eval('a', els => 
          els.map(a => ({ 
            text: a.textContent.trim(), 
            href: a.href 
          })).filter(link => link.text && link.text.length > 0)
        );

        console.log(`   Found ${links.length} links on this page`);

        // Search for exact match first
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

          // Click the process link
          console.log('🖱️  Clicking process link...');
          await page.click(`a:has-text("${matchedLink.text}")`);
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

          // Extract information from detail page
          console.log(`\n📋 Process Details:`);
          console.log(`   🔗 URL: ${page.url()}`);
          
          const bodyText = await page.textContent('body');
          
          // Try to find file path
          const pathMatch = bodyText?.match(/[A-Za-z]:\\[^\s<>"'\n]+/);
          if (pathMatch) {
            console.log(`   📁 File Path: ${pathMatch[0]}`);
          }
          
          // Try to find product name
          const productMatch = bodyText?.match(/Product\s*Name\s*[:\-]\s*([^\n<]+)/i);
          if (productMatch) {
            console.log(`   📦 Product: ${productMatch[1].trim()}`);
          }

          // Try to find company
          const companyMatch = bodyText?.match(/Company\s*[:\-]\s*([^\n<]+)/i);
          if (companyMatch) {
            console.log(`   🏢 Company: ${companyMatch[1].trim()}`);
          }
          
          console.log('\n✨ Search completed! Browser will stay open for 10 seconds...\n');
          await page.waitForTimeout(10000);
          
          break;
        } else {
          console.log(`   ❌ Not found on page ${pageNum}, checking next page...`);
        }

        // Small delay between pages
        await page.waitForTimeout(500);

      } catch (err) {
        console.log(`   ⚠️  Error on page ${pageNum}: ${err.message}`);
        break;
      }
    }

    if (!found) {
      console.log(`\n❌ Process "${processName}" NOT FOUND after checking ${pagesChecked} pages\n`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Total time: ${elapsed}s\n`);

    await browser.close();

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (browser) await browser.close();
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  Process Checker - Interactive Search     ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  const processName = await askQuestion('Enter process name (e.g., notepad.exe, explorer.exe): ');
  
  rl.close();
  
  await searchProcess(processName);
}

main();

const express = require('express');
const path = require('path');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// API endpoint to search for process
app.post('/api/search', async (req, res) => {
  const processName = req.body.processName?.trim();
  
  if (!processName) {
    return res.status(400).json({ error: 'Process name is required' });
  }

  console.log(`\n🔍 Searching for: ${processName}`);
  
  let browser;
  try {
    // Launch browser (visible so you can see the search)
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 500 
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Get first letter and build URL
    const firstLetter = processName[0].toUpperCase();
    const baseUrl = `https://processchecker.com/file.php?start=${firstLetter}`;
    
    console.log(`📄 Starting from: ${baseUrl}`);
    
    const maxPages = 100;
    let found = false;

    // Search through pages
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = pageNum === 1 ? baseUrl : `${baseUrl}&page=${pageNum}`;
      
      console.log(`   Checking page ${pageNum}...`);
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Get all links
      const links = await page.$$eval('a', els => 
        els.map(a => ({ 
          text: a.textContent.trim(), 
          href: a.href 
        })).filter(link => link.text && link.text.length > 0)
      );

      // Search for exact or partial match
      let matchedLink = links.find(link => 
        link.text.toLowerCase() === processName.toLowerCase()
      );
      
      if (!matchedLink) {
        matchedLink = links.find(link => 
          link.text.toLowerCase().includes(processName.toLowerCase())
        );
      }

      if (matchedLink) {
        console.log(`   ✅ Found on page ${pageNum}: ${matchedLink.text}`);
        
        // Navigate to the details page using the href directly
        await page.goto(matchedLink.href, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const bodyText = await page.textContent('body');
        const detailUrl = page.url();
        
        // Extract information
        const pathMatch = bodyText?.match(/[A-Za-z]:\\[^\s<>"'\n]+/);
        const productMatch = bodyText?.match(/Product\s*Name\s*[:\-]\s*([^\n<]+)/i);
        const companyMatch = bodyText?.match(/Company\s*[:\-]\s*([^\n<]+)/i);

        await browser.close();

        return res.json({
          success: true,
          processName: matchedLink.text,
          foundOnPage: pageNum,
          url: detailUrl,
          filePath: pathMatch ? pathMatch[0] : 'Not found',
          product: productMatch ? productMatch[1].trim() : 'Not found',
          company: companyMatch ? companyMatch[1].trim() : 'Not found'
        });
      }

      await page.waitForTimeout(300);
    }

    await browser.close();
    
    return res.json({
      success: false,
      message: `Process "${processName}" not found after checking ${maxPages} pages`
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (browser) await browser.close();
    return res.status(500).json({ error: error.message });
  }
});

// API endpoint to search for multiple processes in parallel
app.post('/api/search-parallel', async (req, res) => {
  const processes = req.body.processes;
  
  if (!Array.isArray(processes) || processes.length === 0) {
    return res.status(400).json({ error: 'Processes array is required' });
  }

  console.log(`\n🚀 Starting parallel search for ${processes.length} process(es)`);
  console.log(`📋 Processes: ${processes.join(', ')}\n`);

  // Start searches in parallel (don't wait for all to complete before responding)
  res.json({ success: true, message: `Searching ${processes.length} process(es) in parallel` });

  // Process each in the background
  processes.forEach((processName, index) => {
    setTimeout(() => {
      searchProcessParallel(processName, index);
    }, index * 1000); // Stagger the starts by 1 second each
  });
});

// Helper function to search a single process in the background
async function searchProcessParallel(processName, index) {
  let browser;
  try {
    processName = processName?.trim();
    if (!processName) {
      console.log(`[${index + 1}] Invalid process name`);
      return;
    }

    console.log(`[${index + 1}] 🔍 Searching for: ${processName}`);
    
    // Launch browser (visible so you can see the search)
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 500 
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Get first letter and build URL
    const firstLetter = processName[0].toUpperCase();
    const baseUrl = `https://processchecker.com/file.php?start=${firstLetter}`;
    
    console.log(`[${index + 1}] 📄 Starting from: ${baseUrl}`);
    
    const maxPages = 100;
    let found = false;

    // Search through pages
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = pageNum === 1 ? baseUrl : `${baseUrl}&page=${pageNum}`;
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Get all links
      const links = await page.$$eval('a', els => 
        els.map(a => ({ 
          text: a.textContent.trim(), 
          href: a.href 
        })).filter(link => link.text && link.text.length > 0)
      );

      // Search for exact or partial match
      let matchedLink = links.find(link => 
        link.text.toLowerCase() === processName.toLowerCase()
      );
      
      if (!matchedLink) {
        matchedLink = links.find(link => 
          link.text.toLowerCase().includes(processName.toLowerCase())
        );
      }

      if (matchedLink) {
        console.log(`[${index + 1}] ✅ Found on page ${pageNum}: ${matchedLink.text}`);
        
        // Click and get details using the href directly
        await page.goto(matchedLink.href, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const bodyText = await page.textContent('body');
        
        // Extract information
        const pathMatch = bodyText?.match(/[A-Za-z]:\\[^\s<>"'\n]+/);
        const productMatch = bodyText?.match(/Product\s*Name\s*[:\-]\s*([^\n<]+)/i);
        const companyMatch = bodyText?.match(/Company\s*[:\-]\s*([^\n<]+)/i);

        console.log(`[${index + 1}] 📍 File Path: ${pathMatch ? pathMatch[0] : 'Not found'}`);
        console.log(`[${index + 1}] 🏢 Company: ${companyMatch ? companyMatch[1].trim() : 'Not found'}\n`);
        
        found = true;
        break;
      }

      await page.waitForTimeout(300);
    }

    if (!found) {
      console.log(`[${index + 1}] ❌ "${processName}" not found after checking ${maxPages} pages\n`);
    }

    await browser.close();

  } catch (error) {
    console.error(`[${index + 1}] Error:`, error.message);
    if (browser) await browser.close();
  }
}

app.listen(PORT, () => {
  console.log(`\n✅ Server listening at http://localhost:${PORT}\n`);
  console.log('📖 Features:');
  console.log('  - Enter process names in UI');
  console.log('  - Automated search through processchecker.com pages');
  console.log('  - Parallel searching support\n');
});

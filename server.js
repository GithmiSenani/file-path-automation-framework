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
    // Launch browser
    browser = await chromium.launch({ headless: true });
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
        
        // Click and get details
        await page.click(`a:has-text("${matchedLink.text}")`);
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

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

app.listen(PORT, () => {
  console.log(`\n✅ Server listening at http://localhost:${PORT}\n`);
  console.log('📖 Features:');
  console.log('  - Enter process name in UI');
  console.log('  - Automated search through processchecker.com pages\n');
});

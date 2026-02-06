const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
let browser = null;
let context = null;

// Main search function - case-insensitive exact matching
async function performSearch(processName, browserContext) {
  try {
    const page = await browserContext.newPage();
    const startTime = Date.now();
    const searchStartDate = new Date().toLocaleString();
    
    // Get first letter for alphabetical navigation
    const firstLetter = processName[0].toUpperCase();
    const baseUrl = `https://processchecker.com/file.php?start=${firstLetter}`;
    
    console.log(`Starting from: ${baseUrl}`);
    console.log(`Searching for: "${processName}"\n`);

    // Helper function to get page info
    async function getPageInfo(pageNum) {
      const url = pageNum === 1 ? baseUrl : `${baseUrl}&page=${pageNum}`;
      
      console.log(`Checking page ${pageNum}...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

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

      if (links.length === 0) {
        return { exists: false, first: null, last: null, links: [] };
      }

      return {
        exists: true,
        first: links[0].text.toLowerCase(),
        last: links[links.length - 1].text.toLowerCase(),
        links: links,
        count: links.length
      };
    }

    // Check if process is in the range of a page
    function isInRange(processName, firstProcess, lastProcess) {
      const target = processName.toLowerCase();
      return target >= firstProcess && target <= lastProcess;
    }

    // STEP 1: Exponential search to find rough range
    console.log('Phase 1: Exponential search to find range...\n');
    
    let power = 0;
    let currentPage = 1;
    let lastValidPage = 1;
    let found = false;
    let targetPageInfo = null;

    // Start with page 1
    let pageInfo = await getPageInfo(1);
    
    if (!pageInfo.exists) {
      console.log('No processes found on first page');
      await page.close();
      return;
    }

    console.log(`   Range: "${pageInfo.first}" to "${pageInfo.last}"`);

    // Check if it's on page 1 - EXACT MATCH (case-insensitive)
    const exactMatch = pageInfo.links.find(link => 
      link.text.toLowerCase() === processName.toLowerCase()
    );
    
    if (exactMatch) {
      console.log(`\nFOUND on page 1!`);
      found = true;
      targetPageInfo = { pageNum: 1, link: exactMatch };
    } else if (isInRange(processName, pageInfo.first, pageInfo.last)) {
      console.log(`   Process is in this range!`);
      found = true;
      targetPageInfo = { pageNum: 1, link: exactMatch };
    } else if (processName.toLowerCase() < pageInfo.first) {
      console.log(`\nProcess "${processName}" comes before page 1 alphabetically`);
      await page.close();
      return;
    }

    // Exponential search: check pages 1, 2, 4, 8, 16, 32, 64, 128, 256, 512...
    if (!found) {
      let lowPage = 1;
      let highPage = 1;

      while (!found) {
        power++;
        currentPage = Math.pow(2, power);
        
        try {
          pageInfo = await getPageInfo(currentPage);
          
          if (!pageInfo.exists) {
            console.log(`   Page ${currentPage} doesn't exist`);
            highPage = currentPage;
            break;
          }

          console.log(`   Range: "${pageInfo.first}" to "${pageInfo.last}"`);

          // Check if exact match (case-insensitive)
          const exactMatch = pageInfo.links.find(link => 
            link.text.toLowerCase() === processName.toLowerCase()
          );
          
          if (exactMatch) {
            console.log(`\nFOUND on page ${currentPage}!`);
            found = true;
            targetPageInfo = { pageNum: currentPage, link: exactMatch };
            break;
          }

          // Check if in range
          if (isInRange(processName, pageInfo.first, pageInfo.last)) {
            console.log(`   Process is in this range!`);
            lowPage = currentPage;
            highPage = currentPage;
            found = true;
            targetPageInfo = { pageNum: currentPage, link: exactMatch };
            break;
          }

          // Check if we've passed it
          if (processName.toLowerCase() < pageInfo.first) {
            console.log(`   Passed the target, need to search between page ${lastValidPage} and ${currentPage}`);
            highPage = currentPage;
            lowPage = lastValidPage;
            break;
          }

          lastValidPage = currentPage;

        } catch (error) {
          console.log(`   Error accessing page ${currentPage}, probably doesn't exist`);
          highPage = currentPage;
          break;
        }
      }

      // STEP 2: Binary search between lowPage and highPage
      if (!found && lowPage < highPage) {
        console.log(`\nPhase 2: Binary search between page ${lowPage} and ${highPage}...\n`);

        while (lowPage <= highPage && !found) {
          const midPage = Math.floor((lowPage + highPage) / 2);
          
          pageInfo = await getPageInfo(midPage);
          
          if (!pageInfo.exists) {
            highPage = midPage - 1;
            continue;
          }

          console.log(`   Range: "${pageInfo.first}" to "${pageInfo.last}"`);

          // Check if exact match (case-insensitive)
          const exactMatch = pageInfo.links.find(link => 
            link.text.toLowerCase() === processName.toLowerCase()
          );
          
          if (exactMatch) {
            console.log(`\nFOUND on page ${midPage}!`);
            found = true;
            targetPageInfo = { pageNum: midPage, link: exactMatch };
            break;
          }

          // Check if in range
          if (isInRange(processName, pageInfo.first, pageInfo.last)) {
            console.log(`   Process is in this range!`);
            found = true;
            targetPageInfo = { pageNum: midPage, link: exactMatch };
            break;
          }

          // Adjust search range
          if (processName.toLowerCase() < pageInfo.first) {
            console.log(`   Search left half`);
            highPage = midPage - 1;
          } else {
            console.log(`   Search right half`);
            lowPage = midPage + 1;
          }
        }
      }
    }

    // STEP 3: If we found the page, extract the data
    if (found && targetPageInfo) {
      const finalPageNum = targetPageInfo.pageNum;
      const finalUrl = finalPageNum === 1 ? baseUrl : `${baseUrl}&page=${finalPageNum}`;
      
      await page.goto(finalUrl, { waitUntil: 'domcontentloaded' });

      // Get all links again
      const links = await page.$$eval('a', els => 
        els.map(a => ({ 
          text: a.textContent.trim(), 
          href: a.href 
        }))
        .filter(link => 
          link.text && 
          link.text.length > 0 && 
          link.text.toLowerCase().endsWith('.exe')
        )
      );

      // Find exact match (case-insensitive)
      let matchedLink = links.find(link => 
        link.text.toLowerCase() === processName.toLowerCase()
      );

      if (matchedLink) {
        console.log(`\nFOUND: "${matchedLink.text}" on page ${finalPageNum}!\n`);
        console.log('Clicking on the process link...');
        
        try {
          await page.click(`a:has-text("${matchedLink.text}")`);
        } catch (e) {
          await page.goto(matchedLink.href);
        }
        
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

        // Extract data from table
        console.log(`\nExtracting Process Details from table...`);
        console.log(`   URL: ${page.url()}`);
        
        const extractedData = await page.evaluate(() => {
          const allRows = [];
          const tables = document.querySelectorAll('table');
          
          for (const table of tables) {
            const rows = Array.from(table.querySelectorAll('tr'));
            let headerRow = null;
            let headerIndexes = {};
            
            for (const row of rows) {
              const cells = Array.from(row.querySelectorAll('th, td'));
              const cellTexts = cells.map(c => c.textContent.trim());
              
              if (cellTexts.some(text => text.toLowerCase().includes('path') || text.toLowerCase().includes('product name'))) {
                headerRow = row;
                cellTexts.forEach((text, index) => {
                  const lower = text.toLowerCase();
                  if (lower.includes('path')) headerIndexes.path = index;
                  else if (lower.includes('product')) headerIndexes.product = index;
                  else if (lower.includes('vendor')) headerIndexes.vendor = index;
                });
                break;
              }
            }
            
            if (headerRow && Object.keys(headerIndexes).length > 0) {
              const headerIndex = rows.indexOf(headerRow);
              
              for (let i = headerIndex + 1; i < rows.length; i++) {
                const dataRow = rows[i];
                const dataCells = Array.from(dataRow.querySelectorAll('td'));
                
                if (dataCells.length === 0) continue;
                
                const rowData = {
                  filePath: dataCells[headerIndexes.path]?.textContent.trim() || 'Not found',
                  product: dataCells[headerIndexes.product]?.textContent.trim() || 'Not found',
                  vendor: dataCells[headerIndexes.vendor]?.textContent.trim() || 'Not found'
                };
                
                if (rowData.filePath !== 'Not found' && rowData.filePath.length > 0) {
                  allRows.push(rowData);
                }
              }
              break;
            }
          }
          
          return allRows;
        });
        
        console.log(`   Found ${extractedData.length} row(s) of data`);
        extractedData.forEach((row, index) => {
          console.log(`\n   Row ${index + 1}:`);
          console.log(`     Path: ${row.filePath}`);
          console.log(`     Product Name: ${row.product}`);
          console.log(`     Vendor: ${row.vendor}`);
        });
        
        // Open results page
        console.log('\nOpening results page...\n');
        
        // Calculate search time
        const endTime = Date.now();
        const searchTime = ((endTime - startTime) / 1000).toFixed(2);
        
        const resultsPath = path.join(__dirname, 'ui', 'results.html');
        const resultsUrl = `file:///${resultsPath.replace(/\\/g, '/')}?` + 
          `name=${encodeURIComponent(matchedLink.text)}` +
          `&data=${encodeURIComponent(JSON.stringify(extractedData))}` +
          `&url=${encodeURIComponent(page.url())}` +
          `&page=${finalPageNum}` +
          `&searchTime=${searchTime}` +
          `&searchDate=${encodeURIComponent(searchStartDate)}` +
          `&totalPaths=${extractedData.length}`;
        
        await page.goto(resultsUrl);
        
        console.log(`Search completed in ${searchTime} seconds!`);
      } else {
        // Process not found - show error page
        console.log(`\nProcess "${processName}" not found on page ${finalPageNum}`);
        
        // Show "Not Found" result page
        const endTime = Date.now();
        const searchTime = ((endTime - startTime) / 1000).toFixed(2);
        
        const notFoundData = JSON.stringify([{
          filePath: 'Process not found',
          product: 'N/A',
          vendor: 'N/A'
        }]);
        
        const resultsUrl = `http://localhost:${PORT}/results.html?name=${encodeURIComponent(processName)}&data=${encodeURIComponent(notFoundData)}&url=${encodeURIComponent(finalUrl)}&page=${finalPageNum}&searchTime=${searchTime}&searchDate=${encodeURIComponent(searchStartDate)}&totalPaths=0`;
        
        await page.goto(resultsUrl);
        console.log(`\nShowing "Not Found" results page`);
      }
    } else {
      // Process not found at all - show error page
      console.log(`\nProcess "${processName}" not found`);
      
      const endTime = Date.now();
      const searchTime = ((endTime - startTime) / 1000).toFixed(2);
      
      const notFoundData = JSON.stringify([{
        filePath: 'Process not found in database',
        product: 'N/A',
        vendor: 'N/A'
      }]);
      
      const resultsUrl = `http://localhost:${PORT}/results.html?name=${encodeURIComponent(processName)}&data=${encodeURIComponent(notFoundData)}&url=#&page=0&searchTime=${searchTime}&searchDate=${encodeURIComponent(searchStartDate)}&totalPaths=0`;
      
      await page.goto(resultsUrl);
      console.log(`\nShowing "Not Found" results page`);
    }

  } catch (error) {
    console.error(`\nError: ${error.message}`);
  }
}

const server = http.createServer((req, res) => {
  // Handle POST request for search
  if (req.method === 'POST' && req.url === '/api/search') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { processName } = JSON.parse(body);
        
        if (!processName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Process name is required' }));
          return;
        }
        
        console.log(`\n🔍 Starting search for: ${processName}`);
        
        // Send immediate response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Starting search...' }));
        
        // Run the search in the existing browser
        performSearch(processName, context).catch(console.error);
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // Serve static files
  let filePath = path.join(__dirname, 'ui', req.url === '/' ? 'search.html' : req.url);
  
  // Get file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        const html404 = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 - Not Found</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: system-ui, -apple-system, Roboto, "Segoe UI", Arial;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
              }
              .container {
                background: white;
                border-radius: 20px;
                padding: 3rem;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 500px;
              }
              .error-code {
                font-size: 6rem;
                font-weight: bold;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 1rem;
              }
              h1 {
                font-size: 2rem;
                color: #333;
                margin-bottom: 1rem;
              }
              p {
                color: #666;
                font-size: 1.1rem;
                margin-bottom: 2rem;
                line-height: 1.6;
              }
              .btn {
                display: inline-block;
                padding: 1rem 2rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                transition: transform 0.2s;
              }
              .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
              }
              .emoji {
                font-size: 4rem;
                margin-bottom: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="emoji">🔍</div>
              <div class="error-code">404</div>
              <h1>Page Not Found</h1>
              <p>Oops! The page you're looking for doesn't exist.<br>Let's get you back on track.</p>
              <a href="/" class="btn">🏠 Go to Home</a>
            </div>
          </body>
          </html>
        `;
        res.end(html404, 'utf-8');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        const html500 = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>500 - Server Error</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: system-ui, -apple-system, Roboto, "Segoe UI", Arial;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
              }
              .container {
                background: white;
                border-radius: 20px;
                padding: 3rem;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 500px;
              }
              .error-code {
                font-size: 6rem;
                font-weight: bold;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 1rem;
              }
              h1 {
                font-size: 2rem;
                color: #333;
                margin-bottom: 1rem;
              }
              p {
                color: #666;
                font-size: 1.1rem;
                margin-bottom: 2rem;
                line-height: 1.6;
              }
              .btn {
                display: inline-block;
                padding: 1rem 2rem;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                transition: transform 0.2s;
              }
              .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
              }
              .emoji {
                font-size: 4rem;
                margin-bottom: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="emoji">⚠️</div>
              <div class="error-code">500</div>
              <h1>Server Error</h1>
              <p>Something went wrong on our end.<br>Please try again later.</p>
              <a href="/" class="btn">🏠 Go to Home</a>
            </div>
          </body>
          </html>
        `;
        res.end(html500, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Start server and open Chrome
async function startApp() {
  server.listen(PORT, async () => {
    console.log('\n✨ Process Checker Application');
    console.log(`📱 Server running at: http://localhost:${PORT}\n`);
    console.log('🌐 Opening Chrome browser...\n');

    // Launch Chrome browser with the search page
    const browser = await chromium.launch({ 
      headless: false,
      channel: 'chrome'
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(`http://localhost:${PORT}/search.html`);
    
    console.log('✅ Search interface loaded in Chrome!');
    console.log('👉 Enter a process name and click Search\n');
    
    // Keep the browser open
    page.on('close', () => {
      console.log('\n🛑 Browser closed. Shutting down server...');
      server.close();
      process.exit(0);
    });
  });
}

startApp().catch(console.error);

const { chromium } = require('playwright');
const path = require('path');

/**
 * Smart Process Search - Uses exponential + binary search
 * Much faster for processes on high page numbers (e.g., page 600)
 */

// Get process name from command line
const processName = process.argv[2];

if (!processName) {
  console.error('Error: Please provide a process name');
  console.log('Usage: node automate-search-fast.js <processname>');
  console.log('Example: node automate-search-fast.js explorer.exe');
  process.exit(1);
}

console.log(`\nStarting SMART search for: "${processName}"\n`);

// Track start time
const startTime = Date.now();
const searchStartDate = new Date().toLocaleString();

(async () => {
  // Launch browser
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  // Get first letter for alphabetical navigation
  const firstLetter = processName[0].toUpperCase();
  const baseUrl = `https://processchecker.com/file.php?start=${firstLetter}`;
  
  console.log(`Starting from: ${baseUrl}`);
  console.log(`Searching for: "${processName}"\n`);

  try {
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
    pageInfo = await getPageInfo(1);
    
    if (!pageInfo.exists) {
      console.log('No processes found on first page');
      await browser.close();
      process.exit(1);
    }

    console.log(`   Range: "${pageInfo.first}" to "${pageInfo.last}"`);

    // Check if it's on page 1
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
      await browser.close();
      process.exit(0);
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

          // Check if exact match
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

          // Check if exact match
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

      // Find exact match
      let matchedLink = links.find(link => 
        link.text.toLowerCase() === processName.toLowerCase()
      );
      
      // If no exact match, try partial
      if (!matchedLink) {
        matchedLink = links.find(link => 
          link.text.toLowerCase().includes(processName.toLowerCase())
        );
      }

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
        const searchTime = ((endTime - startTime) / 1000).toFixed(2); // in seconds
        
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
        console.log('Browser will stay open. Close it when done.\n');
        
        // Keep browser open
        await new Promise(() => {});
      } else {
        console.log(`\nProcess "${processName}" not found on page ${finalPageNum}`);
        await browser.close();
      }
    } else {
      console.log(`\nProcess "${processName}" not found`);
      await browser.close();
    }

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    await browser.close();
    process.exit(1);
  }
})();

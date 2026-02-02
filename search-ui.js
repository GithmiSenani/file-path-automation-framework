const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;

// Create HTTP server
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
        
        // Run the FAST automation
        const command = `node automate-search-fast.js "${processName}"`;
        
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ Error: ${error.message}`);
            return;
          }
          console.log(stdout);
        });
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
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
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

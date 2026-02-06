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

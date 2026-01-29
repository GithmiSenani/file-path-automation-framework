const { chromium } = require('playwright');
const path = require('path');
const express = require('express');

const app = express();
const PORT = 3000;

// Serve static files from 'ui' folder
app.use(express.static('ui'));
app.use(express.json());

// API endpoint to trigger the search
app.post('/api/search', async (req, res) => {
  const { processName } = req.body;

  if (!processName) {
    return res.status(400).json({ error: 'Process name is required' });
  }

  console.log(`\n🔍 Starting search for: ${processName}`);
  
  // Send immediate response
  res.json({ success: true, message: 'Starting search...' });

  // Import and run the FAST automation
  const { exec } = require('child_process');
  const command = `node automate-search-fast.js "${processName}"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return;
    }
    console.log(stdout);
  });
});

// Start server and open Chrome
async function startApp() {
  const server = app.listen(PORT, async () => {
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

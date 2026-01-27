const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from 'public' folder
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'search.html'));
});

// API endpoint to trigger the search
app.post('/search', (req, res) => {
  const processName = req.body.processName;

  if (!processName) {
    return res.status(400).json({ error: 'Process name is required' });
  }

  console.log(`\n🔍 Starting search for: ${processName}`);

  // Run the automation script
  const command = `node automate-search.js "${processName}"`;
  
  exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        output: stdout 
      });
    }

    if (stderr) {
      console.error(`⚠️ Warning: ${stderr}`);
    }

    console.log(stdout);
    
    res.json({ 
      success: true, 
      message: 'Search completed! Check the browser window for results.',
      output: stdout
    });
  });
});

app.listen(PORT, () => {
  console.log(`\n✨ Process Checker Application Started!`);
  console.log(`📱 Open your browser and go to: http://localhost:${PORT}`);
  console.log(`\n👉 Enter a process name and click Search\n`);
});

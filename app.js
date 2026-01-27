const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from 'ui' folder
app.use(express.static('ui'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'search.html'));
});

// API endpoint to trigger the search
app.post('/api/search', (req, res) => {
  const processName = req.body.processName;

  if (!processName) {
    return res.status(400).json({ error: 'Process name is required' });
  }

  console.log(`\n🔍 Starting search for: ${processName}`);

  // Send immediate response
  res.json({ 
    success: true, 
    message: 'Search started! Browser will open with results shortly.'
  });

  // Run the automation script in background
  const command = `node automate-search.js "${processName}"`;
  
  const child = exec(command, { cwd: __dirname });
  
  // Log output in real-time
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  child.on('error', (error) => {
    console.error(`❌ Error: ${error.message}`);
  });
});

app.listen(PORT, () => {
  console.log(`\n✨ Process Checker Application Started!`);
  console.log(`📱 Open your browser and go to: http://localhost:${PORT}`);
  console.log(`\n👉 Enter a process name and click Search\n`);
});

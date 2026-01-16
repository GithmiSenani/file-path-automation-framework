const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the UI folder as static files
app.use(express.static(path.join(__dirname, 'ui')));

// /search?process=notepad.exe  -> redirects to processchecker first-letter page
app.get('/search', (req, res) => {
  const name = (req.query.process || req.query.processName || '').toString().trim();
  if (!name) return res.status(400).send('Missing ?process= query parameter');
  const firstLetter = encodeURIComponent(name[0].toLowerCase());
  const url = `https://processchecker.com/file.php?start=${firstLetter}`;
  console.log(`Redirecting for process "${name}" -> ${url}`);
  return res.redirect(url);
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});

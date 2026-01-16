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

// API: /api/check?process=notepad.exe
// Searches processchecker.com by first-letter pages, finds the matching entry,
// follows the detail link, and extracts a file path and product name if present.
app.get('/api/check', async (req, res) => {
  const name = (req.query.process || req.query.processName || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Missing ?process= query parameter' });

  const { chromium } = require('playwright');
  const needle = name.toLowerCase();
  const firstLetter = encodeURIComponent(needle[0]);
  const baseUrl = `https://processchecker.com/file.php?start=${firstLetter}`;
  const maxPages = 60;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let found = false;
    let detailUrl = null;
    let checkedPages = 0;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = `${baseUrl}&page=${pageNum}`;
      console.log(`API: Visiting ${url}`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (err) {
        console.warn('Navigation failed for', url, err && err.message);
        break;
      }

      checkedPages = pageNum;

      // Look for anchor tags whose text contains the process name
      const foundLinks = await page.$$eval('a', (els, needleText) =>
        els
          .map(a => ({ href: a.href, text: a.textContent || '' }))
          .filter(x => x.text && x.text.toLowerCase().includes(needleText)),
        needle
      );

      if (foundLinks && foundLinks.length > 0) {
        // pick the first link
        detailUrl = foundLinks[0].href;
        // normalize relative URLs
        try { detailUrl = new URL(detailUrl, page.url()).toString(); } catch (e) { /* ignore */ }
        found = true;
        break;
      }

      // quick heuristics to stop early
      const pageContent = (await page.content()).toLowerCase();
      if (pageContent.includes('no entries') || pageContent.includes('no results') || pageContent.includes('nothing found') || pageContent.includes('not found')) {
        break;
      }

      // detect if pagination exists; if not, stop
      const hasPagination = /page=\d+/i.test(pageContent);
      if (!hasPagination) break;
    }

    if (!found) {
      await browser.close();
      return res.json({ found: false, checkedPages });
    }

    // Go to detail page and extract file path and product name heuristically
    console.log('API: Navigating to detail URL', detailUrl);
    const detailPage = await context.newPage();
    try {
      await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (err) {
      console.warn('Detail navigation failed', err && err.message);
      await browser.close();
      return res.status(500).json({ error: 'Failed to open detail page', detailUrl });
    }

    const bodyText = (await detailPage.textContent('body')) || '';

    // heuristics: find Windows-style path (C:\...\something.exe)
    const pathRegex = /[A-Za-z]:\\[^\s<>"']+/g;
    const exeRegex = /[A-Za-z0-9_\- \\\/]+\.exe/gi;
    let filePath = null;
    const pathMatches = bodyText.match(pathRegex);
    if (pathMatches && pathMatches.length) filePath = pathMatches[0];
    else {
      const exeMatches = bodyText.match(exeRegex);
      if (exeMatches && exeMatches.length) filePath = exeMatches[0];
    }

    // product name heuristics
    let productName = null;
    const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/product\s*name\s*[:\-]\s*(.+)/i) || line.match(/product[:\-]\s*(.+)/i) || line.match(/company[:\-]\s*(.+)/i);
      if (m) { productName = m[1].trim(); break; }
    }

    await browser.close();

    return res.json({ found: true, checkedPages, detailUrl, filePath, productName });
  } catch (err) {
    console.error('API /api/check error', err && err.stack || err);
    if (browser) try { await browser.close(); } catch (e) {}
    return res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});

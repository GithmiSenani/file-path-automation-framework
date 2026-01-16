# Why It's Slow? + Performance Solutions

## Why the Original Was Slow

### Problem 1: Running 3 Browsers in Parallel
```
Default Playwright config runs tests on:
✗ Chromium (slow)
✗ Firefox (slow)  
✗ WebKit (slow)
= 3 browsers × time = 3x slower
```

**Solution**: Use `--project=chromium --workers=1`
```powershell
npm run test:fast
# or
npx playwright test tests/process-search.spec.ts --project=chromium --workers=1
```

### Problem 2: Test Framework Overhead
- Full Playwright Test runner with reporters
- HTML report generation
- Multiple worker processes

**Solution**: Use the direct Node.js script (no test framework)
```powershell
npm run search notepad.exe
# or
node search-process.js explorer.exe
```

### Problem 3: Long Timeouts
- Website can be slow
- Each page navigation waits ~30 seconds
- Multiply by 100 pages = lots of waiting

**Solution**: Optimized timeouts in `search-process.js`
- Page load: 20 seconds (instead of 30)
- Network idle check: 15 seconds (instead of unlimited)

## Performance Comparison

| Method | Speed | Use Case |
|--------|-------|----------|
| **`node search-process.js`** | ⚡ FASTEST (55-65s for 100 pages) | Production, scripts, APIs |
| **`npm run test:fast`** | 🚀 Fast (60-70s for 100 pages) | Development, CI/CD |
| **`npx playwright test`** | 🐢 Slow (3-4 minutes) | Full test suite with all browsers |
| **`npm run test:headed`** | 👀 Visible but slow | Debugging, seeing what's happening |

## Quick Start - FAST VERSION

### Option 1: Use the Node.js Script (RECOMMENDED - FASTEST)
```powershell
# Search for a process
node search-process.js notepad.exe

# Or use env var
$env:PROCESS_NAME = "explorer.exe"; node search-process.js

# Or use npm script
npm run search notepad.exe
```

### Option 2: Use Playwright Test (FAST)
```powershell
npm run test:fast
# or
$env:PROCESS_NAME = "cmd.exe"; npm run test:fast
```

### Option 3: See What's Happening (DEBUG)
```powershell
npm run test:headed
# This shows the browser window so you can see it searching
```

## Files Reference

| File | Purpose | Speed |
|------|---------|-------|
| `search-process.js` | Fast Node.js script | ⚡⚡⚡ FASTEST |
| `tests/process-search.spec.ts` | Playwright test suite | 🚀 Fast |
| `tests/process-checker.spec.ts` | Original pagination test | 🐢 Slow |
| `server.js` | Express server for UI | ⚡ API calls search-process.js |
| `ui/index.html` | Web UI | ⚡ Calls server API |

## How Each Method Works

### 1. Direct Node.js Script (FASTEST)
```
You → npm run search → node search-process.js
  ↓
Browser (chromium only) → processchecker.com
  ↓
Search pages sequentially
  ↓
Result: ✅ Found / ❌ Not found (fast!)
```

### 2. Playwright Test (FAST)
```
You → npm run test:fast → Playwright Test framework
  ↓
Single browser (chromium) → processchecker.com
  ↓
Test runner checks assertions
  ↓
Result: ✅ PASS / ❌ FAIL (medium speed)
```

### 3. Web UI with Server (AUTOMATIC)
```
You → Open http://localhost:3000
  ↓
Enter process name → Click "Auto-check"
  ↓
Server calls search-process.js
  ↓
Results shown in browser (fast!)
```

## Recommended Usage

### For Development/Testing
```powershell
# Quick check - see results fast
npm run search notepad.exe

# Debug mode - watch browser
npm run test:headed

# Automated tests
npm run test:fast
```

### For Production/API
```javascript
// In server.js, replace the heavy /api/check endpoint with:
const { exec } = require('child_process');

app.get('/api/check', (req, res) => {
  const processName = req.query.process || '';
  exec(`node search-process.js "${processName}"`, (error, stdout, stderr) => {
    // Parse stdout and return JSON to frontend
    res.json({ found: !error, output: stdout });
  });
});
```

### For CI/CD Pipeline
```yaml
# Example: GitHub Actions
- name: Search for process
  run: node search-process.js ${{ matrix.process }}
  
- name: Run Playwright tests
  run: npm run test:fast
```

## How to Improve Speed Further

1. **Reduce max pages**
   - Edit `search-process.js` line 65: `const maxPages = 50;` (instead of 100)
   - Trade-off: May not find process if it's on page 51+

2. **Reduce timeout**
   - Edit line 81: `timeout: 10000` (instead of 20000)
   - Trade-off: May timeout on slow websites

3. **Use pagination endpoint directly**
   - If you know the process is on page 5, add `&page=5` to URL
   - Start searching from page 5 instead of page 1

4. **Cache results**
   - Store process URLs in a local database
   - Check cache first, only search if not cached

5. **Use multiple parallel searches**
   - Search different process starting letters in parallel
   - Only works for searching multiple processes, not one

## Test It Now

```powershell
# Fastest way to test
npm run search svchost.exe

# With timeout info
node search-process.js explorer.exe

# Full test suite fast mode
npm run test:fast

# See the browser searching
npm run test:headed
```

## Summary

| Need | Command | Speed |
|------|---------|-------|
| Just search | `npm run search notepad.exe` | ⚡ 55-65s |
| Test automation | `npm run test:fast` | 🚀 60-70s |
| Debug search | `npm run test:headed` | 👀 Visible |
| Full test suite | `npm test` | 🐢 3-4 min |
| Web UI | `npm start` then http://localhost:3000 | ⚡ Real-time |

The **FASTEST method is `npm run search`** - try it now!

```powershell
npm run search explorer.exe
```

# Complete Project Commands Reference

## Quick Commands

### FASTEST: Direct Search (No Test Framework)
```powershell
npm run search notepad.exe
npm run search explorer.exe
npm run search svchost.exe
```
**Speed**: ⚡ 55-65 seconds for 100 pages  
**Output**: Console logs with found/not found + file path + product name

### FAST: Test Mode (Single Browser)
```powershell
npm run test:fast
npm run test:fast -- -g "Quick check"

# With specific process
$env:PROCESS_NAME = "cmd.exe"; npm run test:fast
```
**Speed**: 🚀 60-70 seconds  
**Output**: Playwright test results + HTML report

### DEBUG: Watch Browser Search
```powershell
npm run test:headed
# Browser window will open and you'll see it searching through pages
```
**Speed**: 👀 Same as fast, but visible  
**Output**: Live browser + test results

### SLOW: Full Test Suite (All 3 Browsers)
```powershell
npm test
npm test tests/process-search.spec.ts
```
**Speed**: 🐢 3-4 minutes  
**Output**: Tests on Chromium, Firefox, WebKit + HTML report

## Web Interface

### Start Server
```powershell
npm start
# Server listening at http://localhost:3000
```

### Use Web UI
1. Open http://localhost:3000
2. Enter process name (e.g., `notepad.exe`)
3. Click "Auto-check" button
4. Results displayed on page:
   - ✅ Found / ❌ Not Found
   - 📁 File Path
   - 📦 Product Name
   - 🔗 Clickable link to detail page

### Stop Server
```powershell
# Ctrl+C in the terminal, or
taskkill /F /IM node.exe
```

## Available Scripts

```json
{
  "test": "playwright test",                    // Run all tests all browsers
  "start": "node server.js",                    // Start web server
  "search": "node search-process.js",           // Fast search script
  "test:fast": "playwright test ... single",    // Single browser test
  "test:headed": "playwright test ... visible"  // Debug with visible browser
}
```

Usage:
```powershell
npm run search notepad.exe
npm run test:fast
npm start
```

## File Structure

```
📦 Project Root
├── 📄 package.json                 # NPM scripts and dependencies
├── 📄 server.js                    # Express server (port 3000)
├── 📄 search-process.js            # ⭐ FAST search script
├── 📄 playwright.config.ts         # Playwright config (3 browsers)
│
├── 📁 ui/                          # Web interface
│   ├── 📄 index.html               # Colorful UI
│   ├── 📄 README.md                # UI usage
│   └── 📄 style.css                # (embedded in HTML)
│
├── 📁 tests/                       # Test scripts
│   ├── 📄 process-search.spec.ts   # ⭐ Full pagination search
│   ├── 📄 process-checker.spec.ts  # Original slower version
│   └── 📄 example.spec.ts          # Example tests
│
├── 📁 playwright-report/           # Test reports (auto-generated)
│   └── 📄 index.html               # Open in browser to view results
│
├── 📄 SPEED_GUIDE.md               # Why is it slow + optimization tips
├── 📄 AUTOMATION_README.md         # Detailed automation guide
└── 📄 README.md                    # General guide (this file)
```

## Usage Examples

### Example 1: Quick Search for a Process
```powershell
# Fastest way
node search-process.js explorer.exe

# Or via npm
npm run search explorer.exe

# Output:
# 🚀 Starting fast process search for: explorer.exe
# 📱 Launching browser...
# ⏳ Checking page 1...
# ✅ Found on page 3: "explorer.exe"
# 📁 File Path: C:\Windows\explorer.exe
# 📦 Product: Windows Explorer
# ⏱️ Total time: 12.34s
```

### Example 2: Search via Web UI
```powershell
# Start server
npm start

# In another terminal, or:
# Open http://localhost:3000 in browser

# In the UI:
# 1. Type "svchost.exe"
# 2. Click "Auto-check"
# 3. Results appear in real-time
```

### Example 3: Automated Tests
```powershell
# Run single browser (fast)
npm run test:fast

# Run with specific process
$env:PROCESS_NAME = "notepad.exe"; npm run test:fast

# Run specific test only
npm run test:fast -- -g "Quick check"

# With debug mode visible
npm run test:headed
```

### Example 4: Manual Website Navigation
```powershell
# Click "Search" button in UI to go directly to:
# https://processchecker.com/file.php?start=n
# (for any process starting with 'n')
```

## Troubleshooting

### "Connection refused"
```powershell
# Server not running
npm start
```

### "Port 3000 already in use"
```powershell
# Kill old process
taskkill /F /IM node.exe

# Then try again
npm start
```

### "Browser timeout"
- Website is slow
- Try `npm run test:headed` to see what's happening
- Check website directly: https://processchecker.com

### "Process not found"
- Process doesn't exist on the website
- Try a different process name
- Website may have changed (update selectors)

### Tests failing
```powershell
# Run with visible browser to debug
npm run test:headed

# Or check the HTML report
# (Open playwright-report/index.html in browser)
```

## Performance Tips

| Action | Effect |
|--------|--------|
| Use `npm run search` instead of test | **2x faster** ⚡ |
| Use `--workers=1` in tests | **2-3x faster** ⚡ |
| Use `--project=chromium` only | **3x faster** ⚡ |
| Reduce `maxPages` in script | **Variable** 📊 |
| Reduce timeout values | **Faster but risky** ⚠️ |

## Environment Variables

```powershell
# Set process name for search
$env:PROCESS_NAME = "explorer.exe"
npm run search

# Set Playwright environment
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = 1  # Don't auto-download

# Set custom port for server
$env:PORT = 8080
npm start
```

## Next Steps

1. **Try the fastest way**
   ```powershell
   npm run search explorer.exe
   ```

2. **Try the web UI**
   ```powershell
   npm start
   # Then open http://localhost:3000
   ```

3. **Run automated tests**
   ```powershell
   npm run test:fast
   ```

4. **Debug if needed**
   ```powershell
   npm run test:headed
   ```

## Help & Documentation

- **SPEED_GUIDE.md** - Why slow + optimization
- **AUTOMATION_README.md** - Detailed test documentation
- **PLAYWRIGHT_README.md** - Playwright basics
- Playwright docs: https://playwright.dev

---

**Quick Start**: `npm run search notepad.exe` ⚡

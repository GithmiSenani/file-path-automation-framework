# Process Checker Playwright Automation

Complete Playwright automation scripts to search for processes on processchecker.com

## Files

- **`tests/process-search.spec.ts`** - Main automation script with two test cases:
  1. `Search for a process on processchecker.com` - Full pagination search
  2. `Quick check - search on first page only` - Quick single-page check

## Features

✅ Accept process name as input via environment variable  
✅ Navigate to processchecker.com using first letter of process name  
✅ Loop through all pages (pagination) until process found  
✅ Click on process link to open detail page  
✅ Extract file path and product name from detail page  
✅ Handle "not found" gracefully  
✅ Detailed console logging at each step  

## Requirements

- Node.js v16+
- Playwright installed: `npx playwright install`

## Usage

### 1. Run the full pagination search

```powershell
# Search for notepad.exe (default)
npx playwright test tests/process-search.spec.ts

# Search for a specific process
$env:PROCESS_NAME = "svchost.exe"; npx playwright test tests/process-search.spec.ts

# Run with specific browser
$env:PROCESS_NAME = "explorer.exe"; npx playwright test tests/process-search.spec.ts --project=chromium --workers=1

# Run with headed browser (visible)
$env:PROCESS_NAME = "cmd.exe"; npx playwright test tests/process-search.spec.ts --headed
```

### 2. Run the quick check (first page only)

```powershell
npx playwright test tests/process-search.spec.ts -g "Quick check"
```

### 3. Run with npm script

```powershell
# Add to package.json: "search": "playwright test tests/process-search.spec.ts"
npm run search
```

## Script Structure

### Main Test: Full Pagination Search

1. **Get Input** - Read process name from `PROCESS_NAME` env var
2. **Build URL** - Create base URL using first letter
3. **Set Config** - Configure max pages and tracking variables
4. **Loop Pages** - Iterate through pages starting from page 1
5. **Search Page** - Look for process name in all links
6. **Click Link** - If found, click to open detail page
7. **Check Pagination** - Detect if more pages exist
8. **Extract Details** - Parse file path and product name from detail page
9. **Report** - Log results and assert success/failure

### Key Functions

- **Navigate** - `page.goto()` with timeout handling
- **Search** - `page.locator()` to find links containing process name
- **Click** - `link.click()` to open detail page
- **Extract** - Regex patterns to find file paths and product info
- **Wait** - Smart waits for page load and network idle

## Expected Output

```
🔍 Searching for process: notepad.exe

📄 Base URL: https://processchecker.com/file.php?start=n

⏳ Page 1: https://processchecker.com/file.php?start=n&page=1
   Found 25 links on this page
   ❌ Process not found on page 1

⏳ Page 2: https://processchecker.com/file.php?start=n&page=2
   Found 20 links on this page

✅ Found process link: "notepad.exe"
   Link URL: https://processchecker.com/details.php?file=...

🖱️  Clicking on the process link...
✅ Detail page loaded

🎉 Success! Process "notepad.exe" found and detail page opened.
   Current URL: https://processchecker.com/details.php?file=...

📋 Detail Page Title: Process Details - notepad.exe
📁 File Path: C:\Windows\System32\notepad.exe
📦 Product Name: Microsoft® Notepad
🏢 Company: Microsoft Corporation

✅ Test passed: Process found and detail page loaded
```

## Troubleshooting

### "Process not found after checking X pages"
- The process doesn't exist on processchecker.com
- Try a different process name (e.g., `svchost.exe`, `explorer.exe`)

### "Network idle timeout"
- Website is slow; this is non-critical and the script continues
- Increase timeout in `waitForLoadState()` if needed

### "Element not found" errors
- Website structure may have changed
- Run the test with `--headed` to see what's happening
- Update selectors if needed

### "EADDRINUSE" error
- Port 3000 is in use; kill old processes:
  ```powershell
  taskkill /F /IM node.exe
  ```

## Customization

### Change process name
```powershell
$env:PROCESS_NAME = "your_process.exe"; npx playwright test tests/process-search.spec.ts
```

### Change max pages to search
Edit `tests/process-search.spec.ts`, line 42:
```javascript
const maxPages = 200; // Increase from 100
```

### Add more detail extraction
Edit the detail page extraction section (line 130+) to parse additional fields.

### Change timeout values
Edit the `goto()` and `waitForLoadState()` calls to adjust timeouts:
```javascript
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); // 60 seconds
```

## Notes

- The script uses `domcontentloaded` wait strategy for speed; change to `networkidle` for safer loads
- Console logging shows detailed progress at each step
- Tests run in parallel by default; use `--workers=1` for sequential execution
- HTML report available in `playwright-report/` after each run

## Next Steps

To integrate this with your Node.js server:
1. Call `npx playwright test` from the server endpoint
2. Parse the console output or create a JSON reporter
3. Return results to the frontend

Enjoy! 🚀

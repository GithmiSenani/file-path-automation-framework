# Process Checker UI

A tiny static UI to enter a process name and navigate to the matching start page on processchecker.com.

Usage

- Open the UI in your browser:

  - Double-click `ui/index.html` in your file explorer.
  - Or from PowerShell run:

```powershell
Start-Process -FilePath "ui\\index.html"
```

- Enter the process name (example: `notepad.exe`).
- Toggle "Open in new tab" if you want the target opened in a new tab.
- Click "Search" — you'll be taken to `https://processchecker.com/file.php?start=<first_letter>`.

Notes

- This UI only navigates to the start page for the first letter. To automatically search across pages and confirm if the process exists, use the Playwright test at `tests/process-checker.spec.ts`. You can run it via `npx playwright test tests/process-checker.spec.ts` and set `PROCESS_NAME`/`PROCESS_FIRST_LETTER` environment variables if desired.

Example to run the automated search for `notepad.exe` from PowerShell:

```powershell
$env:PROCESS_NAME = "notepad.exe"; npx playwright test tests/process-checker.spec.ts -g "Verify a process exists on processchecker"
```

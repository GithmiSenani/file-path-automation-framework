@echo off
REM Process Checker Automation - Open in Chrome
REM This script starts the server and opens Chrome automatically

echo.
echo ============================================
echo  Process Checker Automation
echo ============================================
echo.

REM Kill any existing Node processes
echo Stopping any existing servers...
taskkill /F /IM node.exe >nul 2>&1

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start the server in background
echo Starting server...
start "" npm start

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Open Chrome
echo Opening Chrome...
start chrome "http://localhost:3000"

echo.
echo ============================================
echo  Server running at http://localhost:3000
echo ============================================
echo.
echo Features:
echo  1. Enter a process name in the input field
echo  2. Click "Search on Website" to go to processchecker.com
echo  3. Or use command line for automated search:
echo     npm run search explorer.exe
echo.
pause

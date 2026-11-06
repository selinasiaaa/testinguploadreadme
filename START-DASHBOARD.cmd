@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12 or later from https://nodejs.org and try again.
  pause
  exit /b 1
)
node scripts/ensure-deps.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
call npm run dev -- --open
pause

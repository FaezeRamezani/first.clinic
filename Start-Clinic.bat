@echo off
cd /d "%~dp0"

start "" cmd /c "npm run dev:backend"

timeout /t 5 /nobreak >nul

start "" cmd /c "npm run dev"

timeout /t 5 /nobreak >nul

start "" "http://localhost:5173"

exit
@echo off
echo Starting DiveSnap Development Server...
cd /d "%~dp0"
set PATH=C:\Program Files\nodejs;%PATH%
npm run dev
pause

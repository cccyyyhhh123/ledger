@echo off
rem ============================================================
rem  Wallpaper service
rem  Replaces any old copy on 8788, starts wallpapers.ps1, then opens the
rem  wallpaper page through it (same origin as the API, so the page can read
rem  the library).
rem ============================================================
title Wallpaper Service
cd /d "%~dp0"

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8788 .*LISTENING"') do (
  taskkill /f /pid %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul

start "" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wallpapers.ps1"

timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8788/wallpaper.html"
exit /b 0
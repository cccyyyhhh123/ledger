@echo off
rem ============================================================
rem  Wallpaper service
rem  Stops whatever is listening on 8788 first: an old copy can be
rem  running with broken paths, and it would answer instead of the new one.
rem  Then starts wallpapers.ps1 and opens the page through it.
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
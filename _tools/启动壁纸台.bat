@echo off
rem ============================================================
rem  Wallpaper service
rem  Starts wallpapers.ps1 on 127.0.0.1:8788 and replaces any old copy,
rem  because an old one can be listening while serving nothing.
rem
rem  Called with an argument (deskwallpaper:start from the page) it stays
rem  quiet: no browser tab, since the page that asked is already open.
rem ============================================================
title Wallpaper Service
cd /d "%~dp0"

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8788 .*LISTENING"') do (
  taskkill /f /pid %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul

start "" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wallpapers.ps1"

if not "%~1"=="" goto done

timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8788/wallpaper.html"

:done
exit /b 0
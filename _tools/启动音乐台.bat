@echo off
rem ============================================================
rem  音乐台 / music bridge
rem  1) starts music-bridge.ps1 on 127.0.0.1:8787
rem  2) opens the site THROUGH the bridge, so the page and the
rem     player state share one origin and the browser allows it
rem  Close the minimised PowerShell window (or run 停止音乐台.bat).
rem ============================================================
title Music Bridge
cd /d "%~dp0"

start "" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0music-bridge.ps1"
timeout /t 3 /nobreak >nul

start "" "http://127.0.0.1:8787/music.html"
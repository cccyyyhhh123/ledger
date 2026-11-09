@echo off
rem ============================================================
rem  Wallpaper service
rem  1) starts wallpapers.ps1 on 127.0.0.1:8788
rem  2) opens the wallpaper page through it (same origin as the API)
rem  Close the minimised PowerShell window to stop it.
rem ============================================================
title Wallpaper Service
cd /d "%~dp0"
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wallpapers.ps1"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8788/wallpaper.html"
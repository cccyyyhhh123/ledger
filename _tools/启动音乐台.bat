@echo off
rem ============================================================
rem  音乐台 / music bridge
rem  1) starts music-bridge.ps1 — it answers on 127.0.0.1:8787
rem  2) opens the LOCAL music page, because a browser will not let
rem     an https page talk to 127.0.0.1; the local one can.
rem  Close the minimised PowerShell window (or run 停止音乐台.bat)
rem  to stop the bridge.
rem ============================================================
title Music Bridge
cd /d "%~dp0"

start "" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0music-bridge.ps1"
timeout /t 2 /nobreak >nul

start "" "%~dp0..\music.html"
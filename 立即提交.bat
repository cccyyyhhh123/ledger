@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\projects\homework\_tools\auto-commit.ps1"
echo.
echo Done. Log: %~dp0\_tools\auto-commit.log
timeout /t 4 >nul

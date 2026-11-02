@echo off
chcp 65001 >nul
echo Pushing the ledger project to GitHub...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\projects\homework\_tools\auto-commit.ps1"
set ERR=%ERRORLEVEL%
echo.
echo ---- last lines of the log ----
powershell -NoProfile -Command "Get-Content 'D:\projects\homework\_tools\auto-commit.log' -Tail 4"
echo -------------------------------
echo.
if "%ERR%"=="0" (
  echo OK - pushed. The site updates in about a minute; then press Ctrl+F5.
) else if "%ERR%"=="2" (
  echo PUSH FAILED - the commit is saved locally but GitHub did not receive it.
  echo Check the connection and run this again.
) else (
  echo Finished with code %ERR% - see the log above.
)
echo.
pause

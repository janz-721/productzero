@echo off
setlocal
cd /d "%~dp0"
set "NODE_HOME=%LOCALAPPDATA%\Programs\nodejs"
set "PATH=%NODE_HOME%;%PATH%"
set "NEXT_TELEMETRY_DISABLED=1"
echo.
echo  ProductZero is starting...
echo  Open http://localhost:3000 in your browser.
echo  Keep this window open while using the app.
echo.
"%NODE_HOME%\node.exe" "node_modules\next\dist\bin\next" dev -H 127.0.0.1 -p 3000
echo.
echo  Server stopped. Press any key to close.
pause

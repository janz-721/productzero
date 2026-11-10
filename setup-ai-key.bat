@echo off
setlocal
cd /d "%~dp0"
if not exist ".env.local" (
  copy /Y ".env.example" ".env.local" >nul
)
echo.
echo  A local settings file will open in Notepad.
echo  Paste your BigModel API key after AI_API_KEY=
echo  Do NOT share this key with anyone.
echo  Save the file and close Notepad when finished.
echo.
notepad.exe ".env.local"

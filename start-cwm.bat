@echo off
title CWM Control Center
cd /d "C:\Users\cmcca\OneDrive\Documents\CWM OS"
echo Starting CWM Control Center...
start "CWM Control Center" cmd /k "npm run dev"
timeout /t 4 /nobreak > nul
start "" "http://localhost:3000"

@echo off
title Smart Hostel Leave Management System Launcher
echo =============================================================
echo   SMART HOSTEL LEAVE MANAGEMENT SYSTEM (SHLMS) LAUNCHER   
echo =============================================================
echo.
echo Launching Node.js Backend API (Port 5000)...
cd /d "%~dp0backend"
start "Smart Hostel Leave Backend Server" cmd /k npm start

echo Launching Frontend React App (Port 5173)...
cd /d "%~dp0frontend"
start "Smart Hostel Leave Frontend Client" cmd /k npm run dev

echo.
echo =============================================================
echo SHLMS is active. Navigate to http://localhost:5173/  
echo =============================================================
cd /d "%~dp0"
pause
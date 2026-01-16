@echo off
title VIDEO_NEXUS Server

cd /d %~dp0

if not exist node_modules\ (
  echo Installing dependencies...
  call npm install
)

echo.
echo Server starting...
echo Open: http://localhost:3000
echo Press Ctrl+C to stop
echo.

node server.js
pause

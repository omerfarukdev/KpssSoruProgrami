@echo off
rem Node yoksa eski yontemle dogrudan ac
where node >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0index.html"
  exit /b
)
rem Sunucu zaten calisiyorsa yenisini baslatma
powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient('127.0.0.1',8347)).Close(); exit 0 } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  start "KPSS Sunucu" /min cmd /c "node ""%~dp0sunucu.js"""
  timeout /t 1 /nobreak >nul
)
start "" "http://localhost:8347"

@echo off
REM 소스 폴더를 감시하며 자동 처리합니다.
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Process-Videos.ps1" -Watch

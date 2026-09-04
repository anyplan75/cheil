@echo off
REM 소스 폴더의 새 영상을 처리해 NAS에 저장합니다.
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Process-Videos.ps1" %*
pause

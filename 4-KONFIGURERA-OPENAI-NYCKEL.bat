@echo off
cd /d "%~dp0"
title Easily - OpenAI-konfiguration
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\configure-openai-key.ps1"
pause

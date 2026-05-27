@echo off
setlocal
cd /d "%~dp0"

set "PYTHON_CMD="

where py >nul 2>nul
if %errorlevel%==0 set "PYTHON_CMD=py"

if not defined PYTHON_CMD (
  where python >nul 2>nul
  if %errorlevel%==0 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD if exist "C:\Program Files\DsNET Corp\aTube Catcher\Resource\python-3.8.19-embed-amd64\python.exe" (
  set "PYTHON_CMD=C:\Program Files\DsNET Corp\aTube Catcher\Resource\python-3.8.19-embed-amd64\python.exe"
)

if not defined PYTHON_CMD (
  echo Nenhum executavel Python foi encontrado.
  echo Instale o Python ou ajuste este arquivo para apontar para o executavel correto.
  pause
  exit /b 1
)

echo Iniciando backend em http://127.0.0.1:8000
"%PYTHON_CMD%" -m uvicorn server:app --host 127.0.0.1 --port 8000

@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en PATH.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm no esta instalado o no esta en PATH.
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Instalando dependencias...
  call npm install
  if errorlevel 1 exit /b 1
)

if not exist "dist" (
  echo [INFO] Generando frontend (dist)...
  call npm run build
  if errorlevel 1 exit /b 1
)

if not exist "dist-server" (
  echo [INFO] Generando backend (dist-server)...
  call npm run server:build
  if errorlevel 1 exit /b 1
)

echo [INFO] Iniciando servidor...
call npm run server:start

endlocal
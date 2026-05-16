@echo off
echo ========================================================
echo   DECENTRALIZED VOTING SYSTEM - STARTUP SCRIPT
echo ========================================================
echo.

:: Check if .env exists
if not exist ".env" (
    echo [!] Error: Root .env file missing.
    echo Please create .env based on .env.example and add your PRIVATE_KEY.
    pause
    exit /b
)

:: Install root dependencies if node_modules missing
if not exist "node_modules" (
    echo [*] Installing root dependencies...
    call npm install
)

:: Install backend dependencies if node_modules missing
if not exist "backend\node_modules" (
    echo [*] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

:: Install frontend dependencies if node_modules missing
if not exist "frontend\node_modules" (
    echo [*] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo [*] Starting Backend and Frontend...
echo.

:: Start project using concurrently
npm run dev

pause

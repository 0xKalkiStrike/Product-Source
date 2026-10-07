@echo off
TITLE Product Verification & Market Intelligence Platform Launcher

echo =======================================================================
echo          Product Verification & Market Intelligence Platform           
echo =======================================================================
echo.

:: Check for Virtual Environment
if not exist "venv\Scripts\python.exe" (
    echo [!] Virtual environment not found. Creating venv...
    python -m venv venv
    echo [*] Installing backend dependencies...
    .\venv\Scripts\pip install -r backend\requirements.txt
)

echo [*] Starting FastAPI Backend Server (Port 8000)...
start "ProductIntel Backend API" cmd /k ".\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"

echo [*] Starting React Vite Frontend Server (Port 5173)...
start "ProductIntel Frontend UI" cmd /k "npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173"

echo.
echo =======================================================================
echo [SUCCESS] Platform services launched successfully!
echo =======================================================================
echo.
echo  Frontend Dashboard UI:  http://127.0.0.1:5173
echo  Backend API Docs:       http://127.0.0.1:8000/docs
echo.
echo  Default System Admin Login:
echo    Email:    admin@platform.com
echo    Password: admin123
echo.
echo =======================================================================
echo Leave the backend and frontend command windows open while using the app.
echo Press any key to exit this launcher window.
pause > nul

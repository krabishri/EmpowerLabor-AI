@echo off
:: Job Mentor Agent - Windows launcher
:: Sets UTF-8 encoding so Indian scripts (₹, Hindi, Tamil etc.) work correctly.

chcp 65001 >nul
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

echo.
echo  =============================================
echo   Job Mentor Agent - IBM Watsonx.ai
echo  =============================================
echo  Open your browser at: http://localhost:5000
echo  Press Ctrl+C to stop.
echo.

python app.py
pause

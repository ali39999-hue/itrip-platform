@echo off
cd /d C:\Users\Lenovo\Desktop\firouzo\itrip-platform
call node scripts\generate-quality-report.mjs > quality.out 2>&1
echo EXIT=%ERRORLEVEL% >> quality.out

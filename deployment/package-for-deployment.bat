@echo off
echo Creating deployment packages for Emiliano Restaurant POS System...
echo.

REM Create directories if they don't exist
if not exist "deployment\packages" mkdir "deployment\packages"
if not exist "deployment\packages\frontend" mkdir "deployment\packages\frontend"
if not exist "deployment\packages\backend" mkdir "deployment\packages\backend"

REM Package frontend
echo Packaging frontend...
xcopy "dist\*" "deployment\packages\frontend\" /E /I /Y
copy "netlify.toml" "deployment\packages\frontend\"
echo Frontend packaged successfully!
echo.

REM Package backend
echo Packaging backend...
xcopy "api\*" "deployment\packages\backend\api\" /E /I /Y
copy ".htaccess" "deployment\packages\backend\"
copy "api\.htaccess" "deployment\packages\backend\api\"
echo Backend packaged successfully!
echo.

REM Package database script
echo Packaging database script...
copy "deployment\export_database.sql" "deployment\packages\backend\"
echo Database script packaged successfully!
echo.

REM Package documentation
echo Packaging documentation...
copy "deployment\README.md" "deployment\packages\"
copy "deployment\netlify-deployment-steps.md" "deployment\packages\"
copy "deployment\infinityfree-deployment-steps.md" "deployment\packages\"
copy "deployment\testing-checklist.md" "deployment\packages\"
echo Documentation packaged successfully!
echo.

echo All packages created successfully!
echo Packages are available in the 'deployment\packages' directory.
echo.

pause

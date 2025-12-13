@echo off
echo ========================================
echo SYCL Variant Build Helper
echo ========================================
echo.
echo This script will:
echo 1. Configure Visual Studio Build Tools
echo 2. Source Intel oneAPI environment
echo 3. Build the SYCL variant
echo.
echo Configuring Visual Studio 2022 Build Tools...
set "VS2022INSTALLDIR=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"
echo Set VS2022INSTALLDIR=%VS2022INSTALLDIR%
echo.
echo Sourcing oneAPI environment...
call "C:\Program Files (x86)\Intel\oneAPI\setvars.bat"
echo.
echo Building SYCL variant...
npm run build:whisper-sycl --verbose
echo.
echo Done!
pause

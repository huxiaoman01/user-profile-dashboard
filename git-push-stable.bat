@echo off
REM 稳定的Git推送脚本 - 多重备选方案
echo 正在尝试推送到GitHub...

REM 方案1：标准推送
echo [方案1] 尝试标准推送...
git push origin main 2>nul
if %errorlevel% == 0 (
    echo ✅ 推送成功！
    goto :success
)

REM 方案2：增加重试次数
echo [方案2] 分批推送...
git push origin main --force-with-lease 2>nul
if %errorlevel% == 0 (
    echo ✅ 推送成功！
    goto :success
)

REM 方案3：使用不同的HTTP版本
echo [方案3] 使用HTTP/2...
git config http.version HTTP/2
git push origin main 2>nul
if %errorlevel% == 0 (
    echo ✅ 推送成功！
    goto :success
)

REM 方案4：分块推送（如果有多个提交）
echo [方案4] 检查是否需要分块推送...
for /f "tokens=*" %%i in ('git rev-list --count HEAD ^origin/main 2^>nul') do set COMMITS=%%i
if %COMMITS% gtr 1 (
    echo 检测到 %COMMITS% 个提交，尝试逐个推送...
    for /l %%i in (1,1,%COMMITS%) do (
        git push origin HEAD~%COMMITS%:refs/heads/main --force-with-lease
        set /a COMMITS=COMMITS-1
    )
)
git push origin main

:success
echo.
echo 🎉 Git推送完成！
pause
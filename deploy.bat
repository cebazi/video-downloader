@echo off
chcp 65001 >nul
echo ========================================
echo   Video Downloader - 部署到 Render
echo ========================================
echo.

echo [1/4] 检查 Git 状态...
cd /d "%~dp0"
if not exist ".git" (
    echo 初始化 Git 仓库...
    git init
    git branch -M main
)

echo.
echo [2/4] 添加所有文件到 Git...
git add .

echo.
echo [3/4] 提交更改...
set /p commit_msg="请输入提交描述 (默认: Update deployment config): "
if "%commit_msg%"=="" set commit_msg=Update deployment config
git commit -m "%commit_msg%"

echo.
echo [4/4] 推送到 GitHub...
echo 请确保已设置远程仓库。
echo 如果还没有，请运行以下命令：
echo   git remote add origin https://github.com/你的用户名/video-downloader.git
echo.
set /p confirm="是否现在推送到 GitHub? (Y/N): "
if /i "%confirm%"=="Y" (
    git push -u origin main
    echo.
    echo ========================================
    echo   推送成功！
    echo ========================================
    echo.
    echo 下一步：
    echo 1. 访问 https://dashboard.render.com
    echo 2. 点击 "New +" → "Web Service"
    echo 3. 连接此 GitHub 仓库
    echo 4. 点击 "Deploy Web Service"
    echo.
) else (
    echo.
    echo 稍后可以手动运行: git push -u origin main
    echo.
)

pause

# GitHub Pages 部署脚本
# 使用方法：在 PowerShell 中运行 .\deploy_to_github.ps1

Write-Host "=== 小小纺用户画像分析平台 GitHub Pages 部署脚本 ===" -ForegroundColor Green
Write-Host ""

# 检查 Git 是否安装
$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitInstalled) {
    Write-Host "错误: Git 未安装，请先安装 Git" -ForegroundColor Red
    Write-Host "下载地址: https://git-scm.com/downloads" -ForegroundColor Yellow
    exit 1
}

# 检查当前目录是否是 Git 仓库
$isGitRepo = Test-Path .git
if (-not $isGitRepo) {
    Write-Host "初始化 Git 仓库..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit: User profile dashboard"
}

Write-Host ""
Write-Host "请按照以下步骤完成部署：" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 在 GitHub 上创建新仓库" -ForegroundColor White
Write-Host "   访问: https://github.com/new" -ForegroundColor Gray
Write-Host "   仓库名: user-profile-dashboard" -ForegroundColor Gray
Write-Host "   描述: 小小纺用户画像分析平台" -ForegroundColor Gray
Write-Host "   选择: Public" -ForegroundColor Gray
Write-Host "   不勾选: Initialize this repository with a README" -ForegroundColor Gray
Write-Host ""

Write-Host "2. 将本地代码推送到 GitHub" -ForegroundColor White
Write-Host "   运行以下命令:" -ForegroundColor Gray
Write-Host "   git remote add origin https://github.com/你的用户名/user-profile-dashboard.git" -ForegroundColor Gray
Write-Host "   git branch -M main" -ForegroundColor Gray
Write-Host "   git push -u origin main" -ForegroundColor Gray
Write-Host ""

Write-Host "3. 启用 GitHub Pages" -ForegroundColor White
Write-Host "   访问: https://github.com/你的用户名/user-profile-dashboard/settings/pages" -ForegroundColor Gray
Write-Host "   Source: Deploy from a branch" -ForegroundColor Gray
Write-Host "   Branch: main" -ForegroundColor Gray
Write-Host "   Folder: / (root)" -ForegroundColor Gray
Write-Host "   点击 Save" -ForegroundColor Gray
Write-Host ""

Write-Host "4. 等待部署完成" -ForegroundColor White
Write-Host "   访问: https://你的用户名.github.io/user-profile-dashboard/" -ForegroundColor Gray
Write-Host "   部署通常需要 1-2 分钟" -ForegroundColor Gray
Write-Host ""

Write-Host "5. (可选) 更新数据" -ForegroundColor White
Write-Host "   运行: python process_data.py" -ForegroundColor Gray
Write-Host "   提交更新: git add data/analytics.json && git commit -m 'Update data' && git push" -ForegroundColor Gray
Write-Host ""

Write-Host "=== 部署完成 ===" -ForegroundColor Green
Write-Host "你的网站将可以通过以下地址访问:" -ForegroundColor Cyan
Write-Host "https://你的用户名.github.io/user-profile-dashboard/" -ForegroundColor Magenta
Write-Host ""

# 提供快速测试
Write-Host "快速测试本地服务器:" -ForegroundColor Yellow
$testLocal = Read-Host "是否现在启动本地服务器测试? (y/n)"
if ($testLocal -eq 'y' -or $testLocal -eq 'Y') {
    if (Test-Path "start_server.py") {
        Write-Host "启动本地服务器..." -ForegroundColor Green
        python start_server.py
    } else {
        Write-Host "start_server.py 不存在" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "更多详细信息请查看 GITHUB_PAGES_DEPLOYMENT.md" -ForegroundColor Gray
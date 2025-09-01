# GitHub Pages 部署指南

## 项目概述
这是一个静态的用户画像分析看板，包含：
- HTML页面 (index.html)
- CSS样式 (css/dashboard.css)
- JavaScript逻辑 (js/dashboard.js, js/charts.js)
- 数据文件 (data/analytics.json)
- 本地开发服务器 (start_server.py)

## 部署到 GitHub Pages 的步骤

### 1. 创建 GitHub 仓库
1. 在 GitHub 上创建一个新的仓库，命名为 `user-profile-dashboard`
2. 将本地代码推送到仓库：

```bash
cd d:\xxf\xxf\user-profile\dashboard
# 初始化 Git 仓库
git init
git add .
git commit -m "Initial commit: User profile dashboard"

# 添加远程仓库
git remote add origin https://github.com/你的用户名/user-profile-dashboard.git
git branch -M main
git push -u origin main
```

### 2. 启用 GitHub Pages
1. 进入 GitHub 仓库页面
2. 点击 "Settings" → "Pages"
3. 在 "Source" 部分选择 "Deploy from a branch"
4. 选择 "main" 分支和 "/(root)" 文件夹
5. 点击 "Save"

### 3. 等待部署完成
GitHub 会自动构建并部署你的网站。通常需要 1-2 分钟。

### 4. 访问你的网站
部署完成后，你的网站将可以通过以下 URL 访问：
```
https://你的用户名.github.io/user-profile-dashboard/
```

## 重要注意事项

### 1. 数据文件更新
GitHub Pages 部署的是静态文件，如果需要更新数据：
1. 运行数据处理脚本：`python process_data.py`
2. 提交更新的 `data/analytics.json` 文件
3. 推送到 GitHub：`git add data/analytics.json && git commit -m "Update data" && git push`

### 2. 跨域问题
由于 GitHub Pages 使用 HTTPS，而你的数据文件是相对路径引用，不会出现跨域问题。

### 3. 缓存问题
GitHub Pages 有缓存机制，如果更新后看不到变化，可以：
1. 强制刷新浏览器 (Ctrl+F5)
2. 或者在 URL 后添加版本号：`?v=2`

### 4. 自定义域名（可选）
如果你想使用自定义域名：
1. 在仓库 Settings → Pages → Custom domain 中输入你的域名
2. 在你的域名服务商处配置 CNAME 记录

## 本地开发与测试

### 启动本地服务器
```bash
python start_server.py
```
服务器将在 http://localhost:8080 启动

### 生成数据文件
```bash
python process_data.py
```

## 项目结构说明
```
dashboard/
├── index.html          # 主页面
├── css/
│   └── dashboard.css   # 样式文件
├── js/
│   ├── dashboard.js    # 主要逻辑
│   └── charts.js       # 图表相关
├── data/
│   └── analytics.json  # 分析数据
├── start_server.py     # 本地服务器
├── process_data.py     # 数据处理脚本
└── README.md          # 项目说明
```

## 故障排除

### 常见问题
1. **页面空白**：检查浏览器控制台是否有错误
2. **数据加载失败**：确保 analytics.json 文件存在且格式正确
3. **样式错乱**：检查网络连接，CDN 资源可能加载失败

### 技术支持
如果遇到问题，可以：
1. 检查 GitHub Actions 部署日志
2. 在浏览器中按 F12 查看控制台错误
3. 确保所有文件路径都是相对路径

## 性能优化建议

1. **压缩资源**：可以压缩 CSS 和 JS 文件减小体积
2. **CDN 优化**：所有外部资源都已使用 CDN，无需额外优化
3. **缓存策略**：GitHub Pages 会自动处理缓存

---

部署完成后，你的用户画像分析平台就可以通过互联网访问了！🎉
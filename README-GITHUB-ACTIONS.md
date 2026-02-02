# 使用 GitHub Actions 自动打包 macOS 版本

在 Windows 上无法直接打包 macOS 应用，但可以使用 GitHub Actions 自动完成！

---

## 🚀 快速开始

### 方法一：通过 Git 推送自动打包

1. **初始化 Git 仓库**（如果还没有）
   ```bash
   git init
   git add .
   git commit -m "Add macOS build support"
   ```

2. **创建 GitHub 仓库并推送**
   ```bash
   # 关联到 GitHub 仓库
   git remote add origin https://github.com/你的用户名/video-downloader.git

   # 推送代码
   git push -u origin main
   ```

3. **等待打包完成**
   - 访问 GitHub 仓库的 **Actions** 标签
   - 看到 "Build macOS Application" 工作流运行
   - 等待约 5-10 分钟

4. **下载打包结果**
   - 在 Actions 页面点击完成的工作流
   - 在 "Artifacts" 部分下载：
     - `macOS-Intel-DMG` - Intel Mac 安装包
     - `macOS-AppleSilicon-DMG` - Apple Silicon (M1/M2/M3) 安装包

---

### 方法二：手动触发打包

1. 访问 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 "Build macOS Application"
4. 点击 **Run workflow** 按钮
5. 选择分支并确认运行

---

### 方法三：通过 Git 标签创建发布版本

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

这将自动创建 GitHub Release 并附带 macOS 安装包。

---

## 📁 工作流文件说明

工作流配置位于: `.github/workflows/build-mac.yml`

### 自动触发条件
- 推送到 `main` 或 `master` 分支
- 修改以下文件时自动运行：
  - `server.js`
  - `electron-main.js`
  - `public/**`
  - `package.json`
  - `.github/workflows/build-mac.yml`

### 打包产物

| 构件 | 说明 |
|------|------|
| `macOS-Intel-DMG` | Intel Mac .dmg 安装包 |
| `macOS-Intel-ZIP` | Intel Mac .zip 压缩包 |
| `macOS-AppleSilicon-DMG` | M1/M2/M3 Mac .dmg 安装包 |
| `macOS-AppleSilicon-ZIP` | M1/M2/M3 Mac .zip 压缩包 |

---

## 🔄 完整工作流程

```
Windows 本机                    GitHub Actions                   用户下载
────────────                    ────────────────                  ─────────
修改代码                         │
    │                            │
    ├── git commit               │
    │                            │
    └── git push ──────────────▶ macOS runner
                                       │
                                       ├─ 安装 Node.js
                                       ├─ 安装依赖
                                       ├─ 下载 yt-dlp
                                       ├─ 安装 ffmpeg
                                       ├─ 打包应用
                                       │
                                       └─ 上传产物
                                            │
                                            ▼
                                    用户下载 DMG 安装
```

---

## 📦 下载打包结果

### 方式一：从 Actions 下载

1. 访问仓库的 **Actions** 页面
2. 点击最近的工作流
3. 滚动到底部的 **Artifacts** 区域
4. 下载所需的组件

### 方式二：从 Releases 下载（仅限带标签的版本）

1. 访问仓库的 **Releases** 页面
2. 找到对应的版本
3. 下载 `.dmg` 或 `.zip` 文件

---

## ⚡ 加速技巧

### 本地测试修改

在推送前先在本地测试基本功能：

```bash
npm start
# 测试 Web 界面是否正常
```

### 只在必要时触发打包

修改 `build-mac.yml` 中的 `paths` 配置，只在核心文件改变时触发：

```yaml
paths:
  - 'server.js'
  - 'electron-main.js'
  - 'public/**'
  - 'package.json'
```

---

## 🎯 常见问题

### Q: 打包需要多长时间？
A: 约 5-10 分钟，包括安装依赖和打包时间。

### Q: 可以同时打包 Windows 版本吗？
A: 可以！我可以创建一个包含 macOS 和 Windows 的双平台打包配置。

### Q: 打包失败怎么办？
A: 检查 Actions 页面的日志，通常会显示具体错误信息。

### Q: 需要付费吗？
A: GitHub Actions 公开仓库完全免费，私有仓库每月有免费额度（2000 分钟）。

---

## 📝 下一步

如需同时支持 Windows 自动打包，告诉我，我可以创建完整的跨平台打包配置！

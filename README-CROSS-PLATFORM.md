# 🌍 跨平台自动打包指南

一次推送，生成 Windows + macOS 所有版本！

---

## 🚀 快速开始

### 1️⃣ 推送代码

```bash
git add .
git commit -m "Update app"
git push
```

### 2️⃣ 等待打包完成

访问 GitHub 仓库的 **Actions** 页面，看到两个任务并行运行：

- 🪟 **Build Windows** - 约 3-5 分钟
- 🍎 **Build macOS** - 约 5-10 分钟

### 3️⃣ 下载安装包

在 Actions 页面的工作流中，下载对应的 Artifacts：

| 平台 | 组件名 | 文件说明 |
|------|--------|----------|
| Windows | `Windows-Portable` | `.exe` 便携版 |
| macOS Intel | `macOS-Intel-DMG` | Intel Mac `.dmg` |
| macOS Intel | `macOS-Intel-ZIP` | Intel Mac `.zip` |
| macOS M系列 | `macOS-AppleSilicon-DMG` | M1/M2/M3 `.dmg` |
| macOS M系列 | `macOS-AppleSilicon-ZIP` | M1/M2/M3 `.zip` |

---

## 📋 输出产物总览

### Windows 版本

| 文件名 | 格式 | 架构 | 说明 |
|--------|------|------|------|
| `NEXUS视频下载器-1.0.0-portable.exe` | Portable | x64 | 免安装，双击运行 |

### macOS 版本

| 文件名 | 格式 | 架构 | 适用机型 |
|--------|------|------|----------|
| `NEXUS视频下载器-1.0.0-x64.dmg` | DMG | x64 | Intel Mac |
| `NEXUS视频下载器-1.0.0-x64.zip` | ZIP | x64 | Intel Mac |
| `NEXUS视频下载器-1.0.0-arm64.dmg` | DMG | arm64 | M1/M2/M3 Mac |
| `NEXUS视频下载器-1.0.0-arm64.zip` | ZIP | arm64 | M1/M2/M3 Mac |

---

## 🎯 触发方式

### 自动触发（推荐）

推送代码到 `main` 或 `master` 分支时自动运行：

```bash
git push
```

### 手动触发

1. 访问 GitHub 仓库 → **Actions** 标签
2. 选择 **"Build Cross-Platform Apps"** 工作流
3. 点击 **"Run workflow"** 按钮
4. 可选择是否创建 Release

### 版本发布

推送 Git 标签时自动创建 Release 并附带所有安装包：

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 🔄 工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      推送代码到 GitHub                          │
│                           │                                   │
│                           ▼                                   │
│              ┌───────────────────────┐                        │
│              │  GitHub Actions 触发   │                        │
│              └───────────┬───────────┘                        │
│                          │                                    │
│              ┌───────────┴───────────┐                        │
│              │                       │                        │
│              ▼                       ▼                        │
│    ┌───────────────┐       ┌───────────────┐                   │
│    │ Windows Runner │       │  macOS Runner  │                   │
│    │   (windows)    │       │   (macos)     │                   │
│    └───────┬───────┘       └───────┬───────┘                   │
│            │                       │                           │
│            ├─ 安装依赖             ├─ 安装依赖                 │
│            ├─ 验证工具             ├─ 下载 yt-dlp              │
│            ├─ 打包 Windows         ├─ 安装 ffmpeg              │
│            └─ 上传产物             ├─ 打包 macOS               │
│                                         └─ 上传产物               │
│                                                 │                 │
│                                                 ▼                 │
│                                    ┌───────────────────────┐    │
│                                    │   合并到 Release      │    │
│                                    └───────────────────────┘    │
│                                                 │                 │
│                                                 ▼                 │
│                                    ┌───────────────────────┐    │
│                                    │  用户下载各平台安装包  │    │
│                                    └───────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 下载方式

### 方式一：从 Actions 下载

1. 访问仓库的 **Actions** 页面
2. 点击最新的工作流运行
3. 滚动到 **Artifacts** 区域
4. 下载所需的组件

### 方式二：从 Releases 下载（推荐）

1. 访问仓库的 **Releases** 页面
2. 找到对应的版本标签
3. 根据你的平台下载对应文件

---

## 🛠️ 配置说明

工作流文件: `.github/workflows/build-all.yml`

### 自动触发条件

修改以下文件时会自动触发打包：
- `server.js` - 后端服务
- `electron-main.js` - Electron 主进程
- `electron-preload.js` - 预加载脚本
- `public/**` - 前端资源
- `package.json` - 项目配置
- `.github/workflows/build-all.yml` - 工作流文件本身

### 并行执行

Windows 和 macOS 打包任务**并行运行**，节省时间！

---

## ⏱️ 时间估算

| 平台 | 预计时间 |
|------|----------|
| Windows | 3-5 分钟 |
| macOS Intel | 5-8 分钟 |
| macOS Apple Silicon | 5-8 分钟 |
| **总计** | **约 8-10 分钟**（并行） |

---

## 🎉 使用示例

### 场景一：日常开发推送

```bash
# 修改代码后
git add .
git commit -m "Fix download progress bug"
git push

# GitHub 自动开始打包，约 10 分钟后完成
```

### 场景二：发布新版本

```bash
# 创建版本标签
git tag v1.1.0
git push origin v1.1.0

# GitHub 自动：
# 1. 打包所有平台
# 2. 创建 Release
# 3. 上传所有安装包
```

### 场景三：手动触发打包

1. 在 GitHub 网页上操作
2. Actions → "Build Cross-Platform Apps" → "Run workflow"
3. 可选勾选 "创建 GitHub Release"

---

## 📊 打包统计

每次推送生成的文件：

| 平台 | 文件数 | 总大小 |
|------|--------|--------|
| Windows | 1 | ~100MB |
| macOS | 4 | ~150MB |
| **合计** | **5** | **~250MB** |

---

## 💡 提示

1. **首次推送**可能需要更长时间（安装依赖）
2. **后续推送**会更快（利用缓存）
3. **Artifacts 保留** 30 天后自动删除
4. **Release 版本**永久保存

---

## 🚀 下一步

所有配置已完成！

现在你可以：

1. ✅ 在 Windows 上开发
2. ✅ 推送代码到 GitHub
3. ✅ 自动获取 Windows + macOS 安装包

开始你的第一次跨平台打包吧！🎉

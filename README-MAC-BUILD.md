# Mac 版本打包指南

## 在 Mac 上打包

### 前置要求

1. macOS 系统 (Intel 或 Apple Silicon)
2. Node.js 已安装
3. Xcode Command Line Tools 已安装

### 步骤

#### 1. 克隆/下载项目到 Mac

```bash
git clone <repository-url>
cd video-downloader
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 准备 Mac 工具

**安装 yt-dlp:**
```bash
mkdir -p tools-mac
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o tools-mac/yt-dlp
chmod +x tools-mac/yt-dlp
```

**安装 ffmpeg:**
```bash
# 使用 Homebrew 安装
brew install ffmpeg

# 复制到项目目录
mkdir -p tools-mac/ffmpeg
cp $(which ffmpeg) tools-mac/ffmpeg/
```

#### 4. 运行打包脚本

```bash
chmod +x build-mac.sh
./build-mac.sh
```

或直接运行:
```bash
npm run build:mac
```

#### 5. 输出文件

打包成功后，在 `dist-v5/` 目录中会生成:

- `NEXUS视频下载器-1.0.0-arm64.dmg` - Apple Silicon (M1/M2/M3)
- `NEXUS视频下载器-1.0.0-arm64.zip`
- `NEXUS视频下载器-1.0.0-x64.dmg` - Intel Mac
- `NEXUS视频下载器-1.0.0-x64.zip`

## 安装使用

1. 双击 `.dmg` 文件
2. 将 "NEXUS视频下载器" 拖到 Applications 文件夹
3. 从 Applications 启动应用

## 自动化打包 (可选)

如需在 CI/CD 中自动打包，可以使用 GitHub Actions:

```yaml
name: Build macOS

on:
  push:
    branches: [ main ]

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Download yt-dlp
        run: |
          mkdir -p tools-mac
          curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o tools-mac/yt-dlp
          chmod +x tools-mac/yt-dlp
      - name: Install ffmpeg
        run: |
          brew install ffmpeg
          mkdir -p tools-mac/ffmpeg
          cp $(which ffmpeg) tools-mac/ffmpeg/
      - name: Build
        run: npm run build:mac
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: macOS-DMG
          path: dist-v5/*.dmg
```

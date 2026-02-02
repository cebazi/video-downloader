# macOS 工具目录

此目录包含 macOS 版本所需的工具。

## 所需文件

### 1. yt-dlp

从 GitHub 下载最新版本:

```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o tools-mac/yt-dlp
chmod +x tools-mac/yt-dlp
```

或访问: https://github.com/yt-dlp/yt-dlp/releases

### 2. ffmpeg

#### 方式 1: 使用 Homebrew (推荐)

```bash
brew install ffmpeg
cp $(which ffmpeg) tools-mac/ffmpeg/
```

#### 方式 2: 下载预编译版本

访问: https://evermeet.cx/ffmpeg/

下载 `ffmpeg-*.zip`，解压后将 `ffmpeg` 复制到此目录的 `ffmpeg/` 子目录。

## 目录结构

```
tools-mac/
├── README.md           # 本文件
├── yt-dlp              # yt-dlp 可执行文件 (无扩展名)
└── ffmpeg/
    └── ffmpeg          # ffmpeg 可执行文件
```

## 验证

```bash
# 检查 yt-dlp
./tools-mac/yt-dlp --version

# 检查 ffmpeg
./tools-mac/ffmpeg/ffmpeg -version
```

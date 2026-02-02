#!/bin/bash
# macOS 打包脚本 - NEXUS 视频下载器

echo "🍎 NEXUS 视频下载器 - macOS 打包脚本"
echo "======================================"

# 检查平台
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 错误: 此脚本只能在 macOS 上运行"
    echo "   当前系统: $OSTYPE"
    exit 1
fi

# 确保在项目根目录
cd "$(dirname "$0")"

# 1. 准备 Mac 工具目录
echo ""
echo "📁 准备 Mac 工具目录..."
mkdir -p tools-mac/ffmpeg

# 2. 下载 yt-dlp for macOS
if [ ! -f "tools-mac/yt-dlp" ]; then
    echo "📥 下载 yt-dlp for macOS..."
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o tools-mac/yt-dlp
    chmod +x tools-mac/yt-dlp
    echo "✅ yt-dlp 下载完成"
else
    echo "✅ yt-dlp 已存在"
fi

# 3. 检查 ffmpeg
if [ ! -f "tools-mac/ffmpeg/ffmpeg" ]; then
    echo ""
    echo "⚠️  ffmpeg 未找到"
    echo "   请选择安装方式:"
    echo "   1) 使用 Homebrew 安装 (推荐):"
    echo "      brew install ffmpeg"
    echo "      cp \$(which ffmpeg) tools-mac/ffmpeg/"
    echo ""
    echo "   2) 从网站下载预编译版本:"
    echo "      https://evermeet.cx/ffmpeg/"
    echo "      将下载的 ffmpeg 复制到 tools-mac/ffmpeg/"
    echo ""
    echo "   安装完成后，重新运行此脚本"
    exit 1
else
    echo "✅ ffmpeg 已存在"
fi

# 4. 验证工具
echo ""
echo "🔍 验证工具..."
echo "yt-dlp:"
ls -lh tools-mac/yt-dlp
echo "ffmpeg:"
ls -lh tools-mac/ffmpeg/ffmpeg

# 5. 运行打包
echo ""
echo "🔨 开始打包..."
npm run build:mac

# 6. 检查输出
echo ""
echo "📦 打包完成! 输出文件:"
ls -lh dist-v5/*.dmg 2>/dev/null || echo "未找到 .dmg 文件"
ls -lh dist-v5/*.zip 2>/dev/null || echo "未找到 .zip 文件"

echo ""
echo "✅ macOS 打包完成!"
echo "   可以在 dist-v5/ 目录中找到安装包"

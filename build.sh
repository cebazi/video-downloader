#!/bin/bash
set -e

echo "========================================="
echo "  开始构建 - 安装依赖"
echo "========================================="
echo ""

# 更新包管理器
echo "[1/4] 更新包管理器..."
apt-get update -qq

# 安装 ffmpeg
echo "[2/4] 安装 ffmpeg..."
apt-get install -y ffmpeg python3 python3-pip

# 安装 yt-dlp (使用 pip，更可靠)
echo "[3/4] 安装 yt-dlp..."
pip3 install --no-cache-dir yt-dlp

# 安装 Node 依赖
echo "[4/4] 安装 Node 依赖..."
npm ci

# 验证安装
echo ""
echo "========================================="
echo "  验证安装"
echo "========================================="
echo ""

echo "ffmpeg: $(ffmpeg -version 2>&1 | head -n 1)"
echo "yt-dlp: $(yt-dlp --version)"
echo "node: $(node --version)"
echo "npm: $(npm --version)"

echo ""
echo "========================================="
echo "  构建完成！"
echo "========================================="

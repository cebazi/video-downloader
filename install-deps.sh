#!/bin/bash
# 安装 yt-dlp 和 ffmpeg 用于 Render 部署

set -e

echo "正在安装依赖..."

# 更新包管理器
apt-get update

# 安装 ffmpeg
apt-get install -y ffmpeg

# 安装 Python 和 pip（用于 yt-dlp）
apt-get install -y python3 python3-pip

# 安装 yt-dlp
pip3 install yt-dlp

# 验证安装
echo "验证安装..."
which ffmpeg && ffmpeg -version | head -n 1
which yt-dlp && yt-dlp --version

echo "依赖安装完成！"

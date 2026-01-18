#!/bin/bash
# 安装 yt-dlp 和 ffmpeg 用于 Render 部署

echo "========================================="
echo "  安装依赖: yt-dlp 和 ffmpeg"
echo "========================================="
echo ""

# 出错时继续执行
set +e

# 更新包管理器
echo "[1/4] 更新包管理器..."
apt-get update -qq

# 安装 ffmpeg
echo "[2/4] 安装 ffmpeg..."
apt-get install -y ffmpeg > /dev/null 2>&1

# 安装 Python 和 pip（用于 yt-dlp）
echo "[3/4] 安装 Python3 和 pip..."
apt-get install -y python3 python3-pip > /dev/null 2>&1

# 安装 yt-dlp
echo "[4/4] 安装 yt-dlp..."
pip3 install yt-dlp -q

# 验证安装
echo ""
echo "========================================="
echo "  验证安装"
echo "========================================="
echo ""

if command -v ffmpeg &> /dev/null; then
    echo "✓ ffmpeg: $(ffmpeg -version 2>&1 | head -n 1)"
else
    echo "✗ ffmpeg 安装失败"
fi

if command -v yt-dlp &> /dev/null; then
    echo "✓ yt-dlp: $(yt-dlp --version 2>&1 | head -n 1)"
else
    echo "✗ yt-dlp 安装失败"
fi

echo ""
echo "========================================="
echo "  依赖安装完成！"
echo "========================================="
echo ""

# 启动服务器
echo "启动 Node.js 服务器..."
exec node server.js


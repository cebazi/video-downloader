# 使用官方 Node.js 镜像作为基础
FROM node:18-slim

# 安装系统依赖
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl && \
    rm -rf /var/lib/apt/lists/*

# 安装 yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装 Node 依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 设置环境变量
ENV PORT=10000
ENV YTDLP_PATH=yt-dlp
ENV FFMPEG_PATH=ffmpeg
ENV NODE_ENV=production

# 暴露端口
EXPOSE 10000

# 启动应用
CMD ["node", "server.js"]

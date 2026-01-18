# 部署到 Render 指南

## 📋 前置要求

1. GitHub 账号
2. Render 账号（[https://render.com](https://render.com)）

## 🚀 部署步骤

### 方法一：通过 GitHub 部署（推荐）

1. **推送代码到 GitHub**

   ```bash
   cd E:\BaiduNetdiskWorkspace\Claude-Code\video-downloader
   git init
   git add .
   git commit -m "Initial commit - Video Downloader"
   git branch -M main
   git remote add origin https://github.com/你的用户名/video-downloader.git
   git push -u origin main
   ```

2. **在 Render 创建新服务**

   - 登录 [Render Dashboard](https://dashboard.render.com)
   -点击 **New +** → **Web Service**
   - 连接你的 GitHub 账户
   - 选择 `video-downloader` 仓库
   - Render 会自动检测 `render.yaml` 配置

3. **确认配置**

   以下配置会自动应用：
   - **Name**: video-downloader
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `chmod +x install-deps.sh && ./install-deps.sh && node server.js`
   - **Region**: Singapore

4. **点击 Deploy Web Service**

   首次部署大约需要 5-10 分钟（安装 yt-dlp 和 ffmpeg）

### 方法二：手动配置

如果你不想使用 `render.yaml`，可以手动配置：

1. 在 Render 创建 **New Web Service**
2. 填写以下信息：

   | 字段 | 值 |
   |------|-----|
   | Name | video-downloader |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `chmod +x install-deps.sh && ./install-deps.sh && node server.js` |

3. 添加环境变量：

   | Key | Value |
   |-----|-------|
   | `PORT` | `10000` |
   | `YTDLP_PATH` | `/usr/local/bin/yt-dlp` |
   | `FFMPEG_PATH` | `/usr/local/bin/ffmpeg` |

## 🔍 部署后验证

部署完成后：

1. 访问你的应用 URL：`https://video-downloader.onrender.com`
2. 测试下载功能，粘贴视频链接
3. 检查 Render 日志确认 yt-dlp 和 ffmpeg 正常工作

## ⚠️ 重要提示

### 免费套餐限制

- **RAM**: 512 MB
- **CPU**: 0.1 核
- **休眠**: 15 分钟无活动后进入休眠
- **冷启动**: 休眠后首次访问需要 ~30 秒启动

### 下载限制

由于资源限制，建议：
- 只下载中小型视频（< 500MB）
- 避免并发下载多个视频
- 长视频可能超时（最大请求时间：90 秒）

### 升级套餐

如需稳定服务，考虑升级到 **Starter 套餐**（$7/月）：
- 512 MB RAM → 2 GB RAM
- 无休眠
- 更快的 CPU

## 🐛 常见问题

### 1. 部署失败：yt-dlp not found

**原因**: 安装脚本执行失败

**解决**: 检查 Logs，查看 `install-deps.sh` 的输出

### 2. 下载超时

**原因**: 视频太大或网络慢

**解决**:
- 升级 Render 套餐
- 或使用本地运行版本

### 3. Socket.IO 连接失败

**原因**: URL 配置错误

**解决**: 确保前端使用 Render 提供的 URL

## 📝 本地开发

本地运行时，需要设置本地路径：

1. 复制 `.env.example` 为 `.env`
2. 修改 `.env` 中的路径：
   ```env
   YTDLP_PATH=E:\\yt-dlp\\yt-dlp.exe
   FFMPEG_PATH=E:\\ffmpeg\\ffmpeg.exe
   ```
3. 启动服务器：
   ```bash
   npm run dev
   ```

## 🔗 相关链接

- [Render 文档](https://render.com/docs)
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
- [项目仓库](https://github.com/你的用户名/video-downloader)

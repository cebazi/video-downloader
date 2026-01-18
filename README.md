# VIDEO_NEXUS // 视频下载终端

一个功能完整的视频下载网站，支持多种清晰度和实时进度显示。

## 功能特性

- 支持多种视频平台（YouTube、Bilibili 等）
- 多清晰度选择：4K、2K、1080P、720P、480P
- 实时下载进度显示
- 下载速度和预计完成时间
- 下载历史记录
- 赛博朋克科技风格界面

## 技术栈

### 后端
- Node.js + Express
- Socket.IO（实时通信）
- yt-dlp（视频下载）
- ffmpeg（视频处理）

### 前端
- 原生 HTML/CSS/JavaScript
- Socket.IO Client

## 安装步骤

### 1. 准备工具

确保你的 E 盘根目录下有以下文件：

- `E:\yt-dlp.exe` - yt-dlp 可执行文件
- `E:\ffmpeg.exe` - ffmpeg 可执行文件

如果没有，请下载：

**yt-dlp:**
```bash
# 使用 pip 安装
pip install yt-dlp

# 或从 GitHub 下载最新版
# https://github.com/yt-dlp/yt-dlp/releases
```

**ffmpeg:**
```bash
# 从官网下载
# https://ffmpeg.org/download.html
```

将下载的文件复制到 `E:\` 目录下。

### 2. 安装项目依赖

```bash
cd E:\BaiduNetdiskWorkspace\Claude-Code\video-downloader
npm install
```

### 3. 启动服务器

```bash
npm start
```

或使用开发模式（自动重启）：

```bash
npm run dev
```

### 4. 访问网站

打开浏览器访问：

```
http://localhost:3000
```

## 使用方法

1. **输入视频 URL**：在输入框中粘贴视频链接
2. **获取信息**：点击搜索按钮获取视频信息
3. **选择清晰度**：选择你想要的视频清晰度
4. **开始下载**：点击"启动下载"按钮
5. **查看进度**：实时查看下载进度和速度
6. **查看历史**：在右侧面板查看下载历史

## 目录结构

```
video-downloader/
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── downloads/          # 下载文件保存目录
└── public/
    ├── index.html      # 前端页面
    ├── style.css       # 样式文件
    └── app.js          # 前端脚本
```

## 支持的视频网站

yt-dlp 支持数百个视频网站，包括但不限于：

- YouTube
- Bilibili
- Vimeo
- Twitter/X
- Instagram
- TikTok
- 以及更多...

查看完整列表：https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md

## 配置说明

### 修改下载路径

编辑 `server.js` 中的 `DOWNLOAD_DIR` 变量：

```javascript
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
```

### 修改工具路径

**本地开发**：编辑 `.env` 文件或使用默认路径

```env
YTDLP_PATH=E:\\yt-dlp\\yt-dlp.exe
FFMPEG_PATH=E:\\ffmpeg\\ffmpeg.exe
```

**云端部署（Render）**：环境变量会自动配置

### 修改端口

编辑 `server.js` 末尾：

```javascript
const PORT = process.env.PORT || 3000;
```

或使用环境变量：

```bash
PORT=8080 npm start
```

## 🌐 云端部署

### 部署到 Render

项目已配置好 `render.yaml`，可以一键部署到 Render：

1. **查看部署指南**：[DEPLOYMENT.md](./DEPLOYMENT.md)
2. **快速部署**：双击运行 `deploy.bat` 推送到 GitHub
3. **在 Render 创建服务**：连接 GitHub 仓库并部署

**部署地址示例**：`https://video-downloader.onrender.com`

### 支持的平台

- ✅ **Render** - 推荐用于生产环境
- ⚠️ **本地运行** - 适合开发测试

## 故障排除

### "无法获取视频信息"
- 检查 URL 是否正确
- 确认视频网站是否被 yt-dlp 支持
- 检查网络连接

### "下载失败"
- 检查 yt-dlp 和 ffmpeg 路径是否正确
- 确认有足够的磁盘空间
- 检查视频是否需要登录或有地区限制

### 进度不更新
- 刷新页面重试
- 检查浏览器控制台是否有错误
- 确认 Socket.IO 连接正常

## 界面预览

- 深色赛博朋克主题
- 霓虹绿强调色
- 动态扫描线效果
- 发光边框和阴影
- 响应式设计

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

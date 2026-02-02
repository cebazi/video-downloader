const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

let mainWindow;
let httpServer;
let io;
const SERVER_PORT = 3000;

// 全局错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  dialog.showErrorBox('程序错误', `发生未捕获的异常:\n${err.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

// 单实例锁定
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  console.log('开始创建窗口...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'NEXUS 视频下载终端',
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  console.log('BrowserWindow 已创建');

  // 渲染进程崩溃
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('渲染进程崩溃:', details);
    dialog.showErrorBox('渲染进程崩溃', `reason: ${details.reason}\nexitCode: ${details.exitCode}`);
  });

  // 页面崩溃
  mainWindow.on('unresponsive', () => {
    console.error('窗口无响应');
  });

  mainWindow.on('responsive', () => {
    console.log('窗口恢复响应');
  });

  // 控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[页面控制台] ${level}: ${message}`);
  });

  // 监听页面加载事件
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('开始加载页面...');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成！');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('页面加载失败:', errorCode, errorDescription, validatedURL, 'isMainFrame:', isMainFrame);
    if (isMainFrame) {
      dialog.showErrorBox('加载失败', `无法加载界面: ${errorDescription}\n错误代码: ${errorCode}\nURL: ${validatedURL}`);
    }
  });

  mainWindow.on('closed', () => {
    console.log('[WINDOW] 窗口已关闭事件触发');
    mainWindow = null;
  });

  // 使用 HTTP 服务器加载界面 - 立即加载
  console.log('窗口已创建，准备加载页面...');

  const url = `http://127.0.0.1:${SERVER_PORT}`;
  console.log('正在加载页面:', url);

  mainWindow.loadURL(url).catch((err) => {
    console.error('loadURL 失败:', err);
    dialog.showErrorBox('加载失败', `无法加载界面: ${err.message}\nURL: ${url}`);
  });

  console.log('窗口创建完成');
}

function startServer() {
  // 设置工具路径
  const resourcesPath = process.resourcesPath;
  const isDev = !app.isPackaged;

  let ytdlpPath, ffmpegPath, publicDir;

  if (isDev) {
    ytdlpPath = 'yt-dlp';
    ffmpegPath = 'ffmpeg';
    publicDir = path.join(__dirname, 'public');
  } else {
    const toolsPath = path.join(resourcesPath, 'tools');
    ytdlpPath = path.join(toolsPath, 'yt-dlp.exe');
    ffmpegPath = path.join(toolsPath, 'ffmpeg', 'bin', 'ffmpeg.exe');
    publicDir = path.join(resourcesPath, 'public');  // 使用 resources/public
  }

  // 创建 Express 应用（直接在主进程中运行）
  const appExpress = express();
  httpServer = http.createServer(appExpress);
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // CORS 中间件
  appExpress.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // 解析 JSON
  appExpress.use(express.json());

  // 静态文件服务 - 手动处理以避免 asar 问题
  appExpress.use((req, res, next) => {
    if (req.method === 'GET' && req.url === '/') {
      const indexPath = path.join(publicDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('index.html not found at: ' + indexPath);
      }
    } else if (req.method === 'GET') {
      const filePath = path.join(publicDir, req.url);
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        next();
      }
    } else {
      next();
    }
  });

  console.log('静态文件目录:', publicDir);
  console.log('index.html 存在:', fs.existsSync(path.join(publicDir, 'index.html')));

  // 配置路径
  const YTDLP_PATH = ytdlpPath;
  const FFMPEG_PATH = ffmpegPath;

  // 下载目录：使用系统默认下载目录
  const DOWNLOAD_DIR = app.getPath('downloads');

  // 确保下载目录存在
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  // 清晰度映射
  const QUALITY_MAP = {
    '4K': '2160',
    '2K': '1440',
    '1080P': '1080',
    '720P': '720',
    '480P': '480'
  };

  // 解析视频信息
  appExpress.post('/api/info', async (req, res) => {
    const { url, cookies } = req.body;

    if (!url) {
      return res.status(400).json({ error: '请提供视频URL' });
    }

    console.log(`=== 获取视频信息 ===`);
    console.log(`URL: ${url}`);
    console.log(`使用 cookies: ${cookies ? '是' : '否'}`);

    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
    ];

    if (cookies && cookies.trim()) {
      args.push('--cookies', cookies.trim());
    }

    args.push(url);

    const ytdlp = spawn(YTDLP_PATH, args);

    let output = '';
    let error = '';

    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      error += data.toString();
    });

    ytdlp.on('close', (code) => {
      console.log(`yt-dlp 退出码: ${code}`);

      if (code !== 0) {
        console.error('获取视频信息失败');
        const errorMsg = error || '无法获取视频信息';

        if (errorMsg.includes('Sign in to confirm') || errorMsg.includes('cookies')) {
          return res.status(400).json({
            error: 'YouTube 需要登录验证',
            details: '请使用 Chrome 浏览器扩展 "Get cookies.txt LOCALLY" 导出 cookies，然后在设置中粘贴',
            needCookies: true
          });
        }

        return res.status(400).json({
          error: '无法获取视频信息',
          details: errorMsg.substring(0, 200)
        });
      }

      try {
        const info = JSON.parse(output);
        res.json({
          title: info.title,
          duration: info.duration,
          uploader: info.uploader,
          thumbnail: info.thumbnail
        });
      } catch (e) {
        console.error('JSON 解析失败:', e.message);
        res.status(500).json({ error: '解析视频信息失败' });
      }
    });
  });

  // 下载视频
  appExpress.post('/api/download', async (req, res) => {
    const { url, quality, downloadType = 'video+audio', socketId, cookies } = req.body;

    console.log(`=== 新下载请求 ===`);
    console.log(`URL: ${url}`);
    console.log(`清晰度: ${quality}`);
    console.log(`下载类型: ${downloadType}`);

    if (!url || !quality) {
      return res.status(400).json({ error: '请提供URL和清晰度' });
    }

    const resolution = QUALITY_MAP[quality] || '1080';
    const socket = io.sockets.sockets.get(socketId);

    if (!socket) {
      console.error(`Socket 连接不存在: ${socketId}`);
      return res.status(400).json({ error: '连接已断开，请刷新页面重试' });
    }

    // 生成输出文件名和扩展名
    const timestamp = Date.now();
    let fileExt = 'mp4';
    let format = 'bestvideo[height<=?' + resolution + ']+bestaudio/best[height<=?' + resolution + ']';
    let extraArgs = [];

    if (downloadType === 'audio') {
      fileExt = 'mp3';
      format = 'bestaudio/best';
      extraArgs = [
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0'
      ];
    } else if (downloadType === 'video') {
      fileExt = 'mp4';
      format = 'bestvideo[height<=?' + resolution + ']/best[height<=?' + resolution + ']';
      extraArgs = [];
    } else {
      fileExt = 'mp4';
      format = 'bestvideo[height<=?' + resolution + ']+bestaudio/best[height<=?' + resolution + ']';
      extraArgs = [
        '--merge-output-format', 'mp4'
      ];
    }

    const outputFile = path.join(DOWNLOAD_DIR, `video_${timestamp}.${fileExt}`);

    const args = [
      '-f', format,
      '--ffmpeg-location', FFMPEG_PATH,
      '-o', outputFile,
      '--newline',
      '--no-playlist',
      ...extraArgs,
    ];

    if (cookies && cookies.trim()) {
      args.push('--cookies', cookies.trim());
    }

    args.push(url);

    console.log(`输出文件: ${outputFile}`);
    console.log(`yt-dlp 路径: ${YTDLP_PATH}`);
    console.log(`ffmpeg 路径: ${FFMPEG_PATH}`);

    const ytdlp = spawn(YTDLP_PATH, args);

    let lastProgress = 0;
    let lastEmitTime = Date.now();

    ytdlp.on('error', (err) => {
      console.error('yt-dlp 进程错误:', err);
      socket.emit('error', { error: 'yt-dlp 进程出错: ' + err.message });
    });

    ytdlp.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('yt-dlp stderr:', output.trim());
    });

    ytdlp.stdout.on('data', (data) => {
      const output = data.toString();

      const progressMatch = output.match(/(\d+\.?\d*)%/);
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);

        const speedMatch = output.match(/at\s+([\d.]+\s*(?:MiB|KiB|GiB|MB|KB|GB)\/s)/i);
        let speed = '0';
        if (speedMatch) {
          speed = speedMatch[1].trim();
        }

        const etaMatch = output.match(/ETA\s+(\d+:\d+|\d+s)/);
        const eta = etaMatch ? etaMatch[1] : '未知';

        const now = Date.now();
        if (progress > lastProgress + 0.5 || now - lastEmitTime > 500) {
          console.log(`>>> 发送进度: ${progress.toFixed(1)}%, 速度: ${speed}, ETA: ${eta}`);
          socket.emit('progress', {
            progress,
            speed,
            eta,
            status: 'downloading'
          });
          lastProgress = progress;
          lastEmitTime = now;
        }
      }

      if (output.includes('100%')) {
        console.log('>>> 下载 100%，开始处理');
        socket.emit('progress', {
          progress: 100,
          speed: '0',
          eta: '完成',
          status: 'processing'
        });
      }
    });

    ytdlp.on('close', (code) => {
      console.log(`>>> yt-dlp 进程结束，退出码: ${code}`);

      if (code === 0) {
        console.log('>>> 下载成功，检查文件...');
        const files = fs.readdirSync(DOWNLOAD_DIR);
        const downloadedFile = files.find(f => f.startsWith(`video_${timestamp}`));

        if (downloadedFile) {
          const filePath = path.join(DOWNLOAD_DIR, downloadedFile);
          const stats = fs.statSync(filePath);

          console.log(`>>> 文件已创建: ${downloadedFile}, 大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

          socket.emit('complete', {
            success: true,
            filename: downloadedFile,
            path: filePath,
            size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB'
          });
        } else {
          console.error('>>> 文件未找到!');
          socket.emit('error', { error: '文件下载失败' });
        }
      } else {
        console.error(`>>> yt-dlp 退出码异常: ${code}`);
        socket.emit('error', { error: `下载失败，退出码: ${code}` });
      }
    });

    res.json({ message: '下载开始' });
  });

  // 下载文件到用户电脑
  appExpress.get('/download/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(DOWNLOAD_DIR, filename);

      if (!fs.existsSync(filePath)) {
        console.error('文件不存在:', filePath);
        return res.status(404).json({ error: '文件不存在' });
      }

      const stat = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);
      const ext = path.extname(filename).toLowerCase();

      const contentType = ext === '.mp3' ? 'audio/mpeg' : 'video/mp4';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Cache-Control', 'no-cache');

      console.log(`开始下载: ${filename}, 大小: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        console.error('文件流错误:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '下载失败' });
        }
      });

      fileStream.on('end', () => {
        console.log(`下载完成: ${filename}`);
      });

      res.on('close', () => {
        fileStream.destroy();
      });

    } catch (error) {
      console.error('下载路由错误:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: '服务器错误' });
      }
    }
  });

  // 删除服务器上的文件
  appExpress.delete('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(DOWNLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true });
  });

  // 获取下载列表
  appExpress.get('/api/downloads', (req, res) => {
    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(f => f.endsWith('.mp4') || f.endsWith('.mp3'))
      .map(f => {
        const filePath = path.join(DOWNLOAD_DIR, f);
        const stats = fs.statSync(filePath);
        const ext = path.extname(f);
        return {
          filename: f,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          type: ext === '.mp3' ? 'audio' : 'video',
          created: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json(files);
  });

  // 调试端点
  appExpress.get('/api/debug', (req, res) => {
    const ytdlp = spawn(YTDLP_PATH, ['--version']);

    let output = '';
    let error = '';

    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      error += data.toString();
    });

    ytdlp.on('close', (code) => {
      res.json({
        ytdlp_path: YTDLP_PATH,
        ytdlp_version: output.trim() || 'unknown',
        ffmpeg_path: FFMPEG_PATH,
        node_version: process.version,
        platform: process.platform,
        is_packaged: app.isPackaged,
        resources_path: resourcesPath,
        exit_code: code,
        error: error || null
      });
    });
  });

  // 测试 YouTube 连接
  appExpress.get('/api/test-youtube', (req, res) => {
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    const ytdlp = spawn(YTDLP_PATH, [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      testUrl
    ]);

    let output = '';
    let error = '';

    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      error += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          res.json({
            success: true,
            title: info.title,
            message: 'YouTube 连接正常'
          });
        } catch (e) {
          res.json({
            success: false,
            message: '解析失败',
            error: e.message
          });
        }
      } else {
        res.json({
          success: false,
          message: 'YouTube 连接失败',
          error: error.substring(0, 500)
        });
      }
    });
  });

  // Socket.IO 连接处理
  io.on('connection', (socket) => {
    console.log('客户端连接:', socket.id);

    socket.on('disconnect', () => {
      console.log('客户端断开:', socket.id);
    });
  });

  // 启动服务器 - 监听所有接口
  httpServer.listen(SERVER_PORT, '127.0.0.1', () => {
    console.log(`服务器运行在 http://127.0.0.1:${SERVER_PORT}`);
    console.log(`yt-dlp 路径: ${YTDLP_PATH}`);
    console.log(`ffmpeg 路径: ${FFMPEG_PATH}`);
    console.log(`下载目录: ${DOWNLOAD_DIR}`);
    console.log(`isPackaged: ${app.isPackaged}`);
    console.log(`resourcesPath: ${resourcesPath}`);

    // 直接创建窗口，使用 HTTP 加载
    console.log('[DEBUG] 准备创建窗口...');
    try {
      createWindow();
    } catch (err) {
      console.error('[ERROR] createWindow 出错:', err);
      dialog.showErrorBox('窗口创建失败', err.message);
    }
  });

  httpServer.on('error', (err) => {
    console.error('服务器错误:', err);
    dialog.showErrorBox('服务器启动失败', `错误: ${err.message}\n端口 ${SERVER_PORT} 可能被占用`);
  });
}

app.whenReady().then(() => {
  console.log('应用已就绪，启动服务器...');
  startServer();
});

app.on('window-all-closed', () => {
  console.log('[APP] window-all-closed 事件触发');
  if (process.platform !== 'darwin') {
    console.log('[APP] 调用 app.quit()');
    app.quit();
  }
});

app.on('before-quit', () => {
  if (httpServer) {
    httpServer.close();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 配置路径
const YTDLP_PATH = 'E:\\yt-dlp\\yt-dlp.exe';
const FFMPEG_PATH = 'E:\\ffmpeg\\ffmpeg-8.0.1-essentials_build\\bin\\ffmpeg.exe';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

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
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: '请提供视频URL' });
  }

  const ytdlp = spawn(YTDLP_PATH, [
    '--dump-json',
    '--no-playlist',
    url
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
    if (code !== 0) {
      return res.status(400).json({ error: '无法获取视频信息，请检查URL是否正确' });
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
      res.status(500).json({ error: '解析视频信息失败' });
    }
  });
});

// 下载视频
app.post('/api/download', async (req, res) => {
  const { url, quality, downloadType = 'video+audio', socketId } = req.body;

  console.log(`=== 新下载请求 ===`);
  console.log(`URL: ${url}`);
  console.log(`清晰度: ${quality}`);
  console.log(`下载类型: ${downloadType}`);
  console.log(`Socket ID: ${socketId}`);

  if (!url || !quality) {
    return res.status(400).json({ error: '请提供URL和清晰度' });
  }

  const resolution = QUALITY_MAP[quality] || '1080';
  const socket = io.sockets.sockets.get(socketId);

  if (!socket) {
    console.error(`Socket 连接不存在: ${socketId}`);
    console.log(`当前连接的 Socket: ${Array.from(io.sockets.sockets.keys()).join(', ')}`);
    return res.status(400).json({ error: '连接已断开，请刷新页面重试' });
  }

  console.log(`Socket 连接正常，开始下载...`);

  // 生成输出文件名和扩展名
  const timestamp = Date.now();
  let fileExt = 'mp4';
  let format = 'bestvideo[height<=?' + resolution + ']+bestaudio/best[height<=?' + resolution + ']';
  let extraArgs = [];

  // 根据下载类型设置参数
  if (downloadType === 'audio') {
    // 仅音频
    fileExt = 'mp3';
    format = 'bestaudio/best';
    extraArgs = [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0'
    ];
  } else if (downloadType === 'video') {
    // 仅视频（无音频）
    fileExt = 'mp4';
    format = 'bestvideo[height<=?' + resolution + ']/best[height<=?' + resolution + ']';
    extraArgs = [];
  } else {
    // 视频+音频（默认）
    fileExt = 'mp4';
    format = 'bestvideo[height<=?' + resolution + ']+bestaudio/best[height<=?' + resolution + ']';
    extraArgs = [
      '--merge-output-format', 'mp4'
    ];
  }

  const outputFile = path.join(DOWNLOAD_DIR, `video_${timestamp}.${fileExt}`);

  // yt-dlp 参数
  const args = [
    '-f', format,
    '--ffmpeg-location', 'E:\\ffmpeg\\ffmpeg-8.0.1-essentials_build\\bin',
    '-o', outputFile,
    '--newline',
    '--no-playlist',
    ...extraArgs,
    url
  ];

  console.log(`输出文件: ${outputFile}`);
  console.log(`yt-dlp 命令: ${YTDLP_PATH} ${args.join(' ')}`);

  const ytdlp = spawn(YTDLP_PATH, args);

  console.log(`yt-dlp 进程 ID: ${ytdlp.pid}`);

  let lastProgress = 0;
  let lastEmitTime = Date.now();

  // 监听所有输出以便调试
  ytdlp.on('error', (err) => {
    console.error('yt-dlp 进程错误:', err);
    socket.emit('error', { error: 'yt-dlp 进程出错: ' + err.message });
  });

  // 监听 stderr
  ytdlp.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('yt-dlp stderr:', output.trim());
  });

  // 监听 stdout - 进度信息在这里！
  ytdlp.stdout.on('data', (data) => {
    const output = data.toString();

    // 解析进度 - 支持多种格式
    const progressMatch = output.match(/(\d+\.?\d*)%/);
    if (progressMatch) {
      const progress = parseFloat(progressMatch[1]);

      // 解析下载速度 - 匹配 "at 1.2MiB/s" 格式
      const speedMatch = output.match(/at\s+([\d.]+\s*(?:MiB|KiB|GiB|MB|KB|GB)\/s)/i);
      let speed = '0';
      if (speedMatch) {
        speed = speedMatch[1].trim();
      }

      // 解析ETA
      const etaMatch = output.match(/ETA\s+(\d+:\d+|\d+s)/);
      const eta = etaMatch ? etaMatch[1] : '未知';

      // 每 0.5 秒或进度增加超过 1% 时更新
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

    // 检测完成
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
      // 检查文件是否成功创建
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

  ytdlp.on('exit', (code) => {
    console.log(`>>> yt-dlp 进程退出, 退出码: ${code}`);
  });

  res.json({ message: '下载开始' });
});

// 下载文件到用户电脑
app.get('/download/:filename', (req, res) => {
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

    // 根据扩展名设置 Content-Type
    const contentType = ext === '.mp3' ? 'audio/mpeg' : 'video/mp4';

    // 设置响应头 - 使用 RFC 5987 编码
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-cache');

    console.log(`开始下载: ${filename}, 大小: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

    // 流式传输文件
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
app.delete('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(DOWNLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  fs.unlinkSync(filePath);
  res.json({ success: true });
});

// 获取下载列表
app.get('/api/downloads', (req, res) => {
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

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('客户端断开:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`yt-dlp 路径: ${YTDLP_PATH}`);
  console.log(`ffmpeg 路径: ${FFMPEG_PATH}`);
  console.log(`下载目录: ${DOWNLOAD_DIR}`);
});

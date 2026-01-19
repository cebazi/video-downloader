// ===== Socket.IO 连接 =====
const socket = io();

// ===== DOM 元素 =====
const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const downloadBtn = document.getElementById('downloadBtn');
const refreshBtn = document.getElementById('refreshBtn');

const videoCard = document.getElementById('videoCard');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoUploader = document.getElementById('videoUploader');
const videoDuration = document.getElementById('videoDuration');

const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const downloadSpeed = document.getElementById('downloadSpeed');
const etaTime = document.getElementById('etaTime');
const downloadStatus = document.getElementById('downloadStatus');

const completeSection = document.getElementById('completeSection');
const completeInfo = document.getElementById('completeInfo');

const historyList = document.getElementById('historyList');
const toastContainer = document.getElementById('toastContainer');

// ===== 状态 =====
let currentVideoInfo = null;
let isDownloading = false;
let userCookies = localStorage.getItem('youtube_cookies') || '';

// ===== 设置面板功能 =====
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsBackdrop = document.getElementById('settingsBackdrop');
const settingsClose = document.getElementById('settingsClose');
const cookiesInput = document.getElementById('cookiesInput');
const cookiesSave = document.getElementById('cookiesSave');
const cookiesClear = document.getElementById('cookiesClear');

// 打开设置面板
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    cookiesInput.value = userCookies;
    settingsModal.classList.add('active');
  });
}

// 关闭设置面板
function closeSettings() {
  settingsModal.classList.remove('active');
}

if (settingsClose) {
  settingsClose.addEventListener('click', closeSettings);
}

if (settingsBackdrop) {
  settingsBackdrop.addEventListener('click', closeSettings);
}

// 保存 cookies
if (cookiesSave) {
  cookiesSave.addEventListener('click', () => {
    userCookies = cookiesInput.value.trim();
    localStorage.setItem('youtube_cookies', userCookies);
    showToast('Cookies 已保存', 'success');
    closeSettings();
  });
}

// 清除 cookies
if (cookiesClear) {
  cookiesClear.addEventListener('click', () => {
    userCookies = '';
    cookiesInput.value = '';
    localStorage.removeItem('youtube_cookies');
    showToast('Cookies 已清除', 'info');
  });
}

// ===== 格式化时长 =====
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ===== Toast 提示 =====
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'error' ? '✕' : '✓';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastSlide 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== 获取视频信息 =====
async function fetchVideoInfo() {
  const url = urlInput.value.trim();

  if (!url) {
    showToast('请输入视频 URL', 'error');
    return;
  }

  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '<span class="btn-loading">⟳</span>';

  try {
    const response = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, cookies: userCookies })
    });

    const data = await response.json();

    if (data.error) {
      // 显示更详细的错误信息
      const errorMsg = data.error + (data.details ? `\n详细信息: ${data.details}` : '');
      showToast(errorMsg, 'error');
      console.error('获取视频信息失败:', data);

      // 如果需要 cookies，提示用户
      if (data.needCookies) {
        setTimeout(() => {
          settingsBtn?.click();
        }, 2000);
      }
      return;
    }

    currentVideoInfo = data;

    // 显示视频信息卡片
    videoThumbnail.style.backgroundImage = `url(${data.thumbnail})`;
    videoTitle.textContent = data.title;
    videoUploader.textContent = data.uploader;
    videoDuration.textContent = formatDuration(data.duration);
    videoCard.classList.add('active');

  } catch (error) {
    showToast('获取视频信息失败', 'error');
    console.error('获取视频信息异常:', error);
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="2"/>
      </svg>
      <span class="btn-text">获取</span>
    `;
  }
}

// ===== 下载视频 =====
async function downloadVideo() {
  const url = urlInput.value.trim();
  const quality = document.querySelector('input[name="quality"]:checked')?.value;
  const downloadType = document.querySelector('input[name="downloadType"]:checked')?.value;

  if (!url) {
    showToast('请输入视频 URL', 'error');
    return;
  }

  if (!quality) {
    showToast('请选择清晰度', 'error');
    return;
  }

  if (!downloadType) {
    showToast('请选择下载类型', 'error');
    return;
  }

  if (isDownloading) {
    showToast('下载正在进行中', 'error');
    return;
  }

  // 如果没有视频信息，先获取
  if (!currentVideoInfo) {
    showToast('正在获取视频信息...', 'info');

    try {
      const infoResponse = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, cookies: userCookies })
      });

      const infoData = await infoResponse.json();

      if (infoData.error) {
        showToast(infoData.error, 'error');
        return;
      }

      // 保存视频信息
      currentVideoInfo = infoData;

      // 显示视频信息卡片
      videoThumbnail.style.backgroundImage = `url(${infoData.thumbnail})`;
      videoTitle.textContent = infoData.title;
      videoUploader.textContent = infoData.uploader;
      videoDuration.textContent = formatDuration(infoData.duration);
      videoCard.classList.add('active');

      showToast('视频信息已获取，开始下载...');

    } catch (error) {
      showToast('获取视频信息失败', 'error');
      return;
    }
  }

  // 开始下载
  isDownloading = true;
  downloadBtn.disabled = true;
  downloadBtn.classList.add('downloading');

  // 重置进度
  progressSection.classList.add('active');
  completeSection.classList.remove('active');
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  downloadSpeed.textContent = '--';
  etaTime.textContent = '--';
  downloadStatus.textContent = '初始化中...';

  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        quality,
        downloadType,
        socketId: socket.id,
        cookies: userCookies
      })
    });

    const data = await response.json();

    if (data.error) {
      showToast(data.error, 'error');
      isDownloading = false;
      downloadBtn.disabled = false;
      downloadBtn.classList.remove('downloading');
    }

  } catch (error) {
    showToast('启动下载失败', 'error');
    isDownloading = false;
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('downloading');
  }
}

// ===== 加载下载历史 =====
async function loadHistory() {
  try {
    const response = await fetch('/api/downloads');
    const files = await response.json();

    if (files.length === 0) {
      historyList.innerHTML = '<div class="history-empty">暂无下载记录</div>';
      return;
    }

    const typeIcon = (type) => type === 'audio' ?
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>' :
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>';

    historyList.innerHTML = files.map(file => `
      <div class="history-item">
        <span class="history-type-icon">${typeIcon(file.type)}</span>
        <span class="history-item-name" onclick="downloadFile('${file.filename}')" title="点击下载">${file.filename}</span>
        <span class="history-item-size">${file.size}</span>
        <button class="history-delete" onclick="deleteFile('${file.filename}')" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
          </svg>
        </button>
      </div>
    `).join('');

  } catch (error) {
    console.error('加载历史失败:', error);
  }
}

// ===== 下载文件 =====
async function downloadFile(filename) {
  try {
    showToast('正在下载...');

    const response = await fetch(`/download/${filename}`);

    if (!response.ok) {
      throw new Error('下载失败');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('下载完成！');

  } catch (error) {
    console.error('下载错误:', error);
    showToast('下载失败，请重试', 'error');
  }
}

// ===== 删除文件 =====
async function deleteFile(filename) {
  if (!confirm(`确定要删除 ${filename} 吗？`)) {
    return;
  }

  try {
    const response = await fetch(`/api/files/${filename}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('文件已删除');
      loadHistory();
    } else {
      showToast('删除失败', 'error');
    }
  } catch (error) {
    showToast('删除失败', 'error');
  }
}

// ===== Socket.IO 事件监听 =====
socket.on('progress', (data) => {
  console.log('收到进度更新:', data);

  if (data.progress !== undefined) {
    progressFill.style.width = `${data.progress}%`;
    progressText.textContent = `${Math.round(data.progress)}%`;
  }

  if (data.speed) {
    downloadSpeed.textContent = data.speed;
  }

  if (data.eta) {
    etaTime.textContent = data.eta;
  }

  const statusMap = {
    'downloading': '下载中...',
    'processing': '处理中...'
  };
  downloadStatus.textContent = statusMap[data.status] || data.status;
});

socket.on('connect', () => {
  console.log('Socket.IO 已连接, ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket.IO 已断开');
});

socket.on('error', (error) => {
  console.error('Socket.IO 错误:', error);
});

socket.on('complete', async (data) => {
  isDownloading = false;
  downloadBtn.disabled = false;
  downloadBtn.classList.remove('downloading');

  progressSection.classList.remove('active');
  completeSection.classList.add('active');
  completeInfo.textContent = `${data.filename} (${data.size})`;

  showToast('下载完成！正在保存到本地...');

  // 自动触发浏览器下载
  try {
    const response = await fetch(`/download/${data.filename}`);

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast('文件已保存到本地！');
    } else {
      showToast('自动下载失败，请从历史记录中手动下载', 'error');
    }
  } catch (error) {
    console.error('自动下载错误:', error);
    showToast('自动下载失败，请从历史记录中手动下载', 'error');
  }

  // 刷新历史列表
  loadHistory();
});

socket.on('error', (data) => {
  isDownloading = false;
  downloadBtn.disabled = false;
  downloadBtn.classList.remove('downloading');

  progressSection.classList.remove('active');
  showToast(data.error || '下载失败', 'error');
});

// ===== 选项卡交互 =====
// 下载类型选项卡
document.querySelectorAll('.option-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    card.querySelector('input').checked = true;
  });
});

// 清晰度选项卡
document.querySelectorAll('.quality-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    btn.querySelector('input').checked = true;
  });
});

// ===== 事件监听 =====
fetchBtn.addEventListener('click', fetchVideoInfo);

downloadBtn.addEventListener('click', downloadVideo);

refreshBtn.addEventListener('click', loadHistory);

urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    fetchVideoInfo();
  }
});

// 当 URL 改变时，重置视频信息
urlInput.addEventListener('input', () => {
  currentVideoInfo = null;
  videoCard.classList.remove('active');
});

// ===== 调试功能 - 测试 YouTube 连接 =====
const debugBtn = document.getElementById('debugBtn');
if (debugBtn) {
  debugBtn.addEventListener('click', async () => {
    showToast('正在测试 YouTube 连接...', 'info');

    try {
      // 先检查系统状态
      const debugResponse = await fetch('/api/debug');
      const debugInfo = await debugResponse.json();

      console.log('系统信息:', debugInfo);
      showToast(`yt-dlp 版本: ${debugInfo.ytdlp_version}`, 'info');

      // 测试 YouTube 连接
      const ytResponse = await fetch('/api/test-youtube');
      const ytResult = await ytResponse.json();

      if (ytResult.success) {
        showToast(`✓ YouTube 连接正常!\n测试视频: ${ytResult.title}`, 'success');
      } else {
        showToast(`✗ YouTube 连接失败!\n${ytResult.message}\n${ytResult.error || ''}`, 'error');
        console.error('YouTube 测试失败:', ytResult);
      }

    } catch (error) {
      showToast('调试请求失败', 'error');
      console.error('调试错误:', error);
    }
  });
}

// ===== 粒子背景动画 =====
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.resize();
    this.init();

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    const particleCount = Math.floor((this.canvas.width * this.canvas.height) / 15000);

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(0, 255, 255, ${p.opacity})`;
      this.ctx.fill();
    });

    // 绘制连线
    this.particles.forEach((p1, i) => {
      this.particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(0, 255, 255, ${0.1 * (1 - dist / 100)})`;
          this.ctx.stroke();
        }
      });
    });

    requestAnimationFrame(() => this.animate());
  }
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  // 初始化粒子背景
  const particleCanvas = document.getElementById('particles');
  if (particleCanvas) {
    new ParticleSystem(particleCanvas).animate();
  }

  // 加载下载历史
  loadHistory();

  // 页面加载动画已在 HTML 中的 script 标签处理
});

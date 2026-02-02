(function() {
// ===== Socket.IO 客户端 (Web 环境) =====
let socket = null;
let socketId = null;

// Web 环境下建立 Socket.IO 连接
function initSocketIO() {
  if (typeof io !== 'undefined' && !socket) {
    socket = io();

    socket.on('connect', () => {
      console.log('Socket.IO 已连接:', socket.id);
      socketId = socket.id;
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO 已断开');
      socketId = null;
    });

    // 监听下载进度
    socket.on('progress', (data) => {
      console.log('下载进度:', data);

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

      downloadStatus.textContent = data.status || '下载中...';
    });

    // 监听下载完成
    socket.on('complete', (data) => {
      console.log('下载完成:', data);
      isDownloading = false;
      downloadBtn.disabled = false;
      downloadBtn.classList.remove('downloading');
      progressSection.classList.remove('active');
      completeSection.classList.add('active');

      if (data.filename) {
        completeInfo.textContent = `文件: ${data.filename} (${data.size})`;
      }

      showToast('下载完成！');
      loadHistory();
    });

    // 监听下载错误
    socket.on('error', (data) => {
      console.error('下载错误:', data);
      isDownloading = false;
      downloadBtn.disabled = false;
      downloadBtn.classList.remove('downloading');
      progressSection.classList.remove('active');
      showToast(data.error || '下载失败', 'error');
    });
  }
}

// ===== 状态变量 =====
let domReady = false;

// ===== Tauri API 检测 =====
// 等待 Tauri API 加载（最多等待 2 秒）
let invoke = null;
let listen = null;
let isTauri = false;

function initTauriAPI() {
  if (window.__TAURI__) {
    invoke = window.__TAURI__.core?.invoke;
    listen = window.__TAURI__.event?.listen;
    isTauri = !!(invoke && listen);
    return true;
  }
  return false;
}

// 立即尝试初始化
if (!initTauriAPI()) {
  // 如果 Tauri 还没准备好，等待一下
  let attempts = 0;
  const maxAttempts = 20;
  const checkInterval = setInterval(() => {
    attempts++;
    if (initTauriAPI() || attempts >= maxAttempts) {
      clearInterval(checkInterval);
      console.log('Tauri API 检测完成:', {
        hasTauri: !!window.__TAURI__,
        isTauri,
        attempts
      });
      // 如果 Tauri API 已准备好，等待 DOM 后初始化
      if (isTauri) {
        console.log('✓ Tauri API 已就绪');
        if (domReady) {
          initApp();
        } else {
          document.addEventListener('DOMContentLoaded', () => initApp(), { once: true });
        }
      }
    }
  }, 100);
} else {
  console.log('✓ Tauri API 立即可用');
  // Tauri 立即可用，等待 DOM 后初始化
  if (domReady) {
    initApp();
  } else {
    document.addEventListener('DOMContentLoaded', () => initApp(), { once: true });
  }
}

console.log('环境检测:', {
  hasTauri: !!window.__TAURI__,
  hasInvoke: !!invoke,
  hasListen: !!listen,
  isTauri
});

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
const downloadPathInput = document.getElementById('downloadPathInput');
const browsePathBtn = document.getElementById('browsePathBtn');

// 下载路径相关
let currentDownloadPath = '';

// 打开设置面板
if (settingsBtn) {
  settingsBtn.addEventListener('click', async () => {
    cookiesInput.value = userCookies;
    // 加载当前下载路径
    try {
      const path = await apiCall('get_download_directory');
      currentDownloadPath = path;
      downloadPathInput.value = path;
    } catch (error) {
      console.error('获取下载路径失败:', error);
    }
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

// 浏览选择下载路径
if (browsePathBtn) {
  browsePathBtn.addEventListener('click', async () => {
    if (!isTauri) {
      showToast('仅在桌面应用中支持', 'error');
      return;
    }

    try {
      // 使用 Tauri 的 dialog API 选择文件夹
      const { open } = window.__TAURI__.dialog;
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择下载目录'
      });

      if (selected && typeof selected === 'string') {
        // 保存到后端
        await apiCall('set_download_directory', { path: selected });
        currentDownloadPath = selected;
        downloadPathInput.value = selected;
        showToast('下载路径已保存', 'success');
      }
    } catch (error) {
      if (error !== 'Cancelled') {
        showToast('设置路径失败: ' + error, 'error');
      }
    }
  });
}

// ===== 格式化时长 =====
function formatDuration(seconds) {
  if (!seconds) return '--:--';
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

// ===== API 调用包装器 =====
async function apiCall(command, args = {}) {
  console.log('API 调用:', { command, args, isTauri });

  if (isTauri && invoke) {
    try {
      const result = await invoke(command, args);
      console.log('API 结果:', result);
      return result;
    } catch (error) {
      console.error('Tauri 调用错误:', error);
      throw error;
    }
  } else {
    // Web 环境降级到 fetch
    const endpoint = args._endpoint || command;
    delete args._endpoint;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    const result = await response.json();
    console.log('Web API 结果:', result);
    return result;
  }
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
    const data = await apiCall('get_video_info', {
      _endpoint: '/api/info',
      url,
      cookies: userCookies || null
    });

    if (data.error) {
      const errorMsg = data.error + (data.details ? `\n详细信息: ${data.details}` : '');
      showToast(errorMsg, 'error');
      console.error('获取视频信息失败:', data);

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
    videoUploader.textContent = data.uploader || '未知';
    videoDuration.textContent = formatDuration(data.duration);
    videoCard.classList.add('active');

  } catch (error) {
    // Tauri 返回的错误可能是字符串或对象
    const errorMsg = typeof error === 'string' ? error : (error.message || String(error));
    showToast('获取视频信息失败: ' + errorMsg, 'error');
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
  console.log('=== downloadVideo 被调用 ===');

  const url = urlInput.value.trim();
  const quality = document.querySelector('input[name="quality"]:checked')?.value;
  const downloadType = document.querySelector('input[name="downloadType"]:checked')?.value;

  console.log('下载参数:', { url, quality, downloadType, isDownloading });

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
      const infoData = await apiCall('get_video_info', {
        _endpoint: '/api/info',
        url,
        cookies: userCookies || null
      });

      if (infoData.error) {
        showToast(infoData.error, 'error');
        return;
      }

      currentVideoInfo = infoData;

      videoThumbnail.style.backgroundImage = `url(${infoData.thumbnail})`;
      videoTitle.textContent = infoData.title;
      videoUploader.textContent = infoData.uploader || '未知';
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
    const result = await apiCall('download_video', {
      _endpoint: '/api/download',
      url,
      quality,
      downloadType,
      socketId,  // Web 环境需要传递 socketId
      cookies: userCookies || null
    });

    if (result.error) {
      showToast(result.error, 'error');
      isDownloading = false;
      downloadBtn.disabled = false;
      downloadBtn.classList.remove('downloading');
    } else {
      showToast('下载已启动', 'success');
    }

  } catch (error) {
    const errorMsg = typeof error === 'string' ? error : (error.message || String(error));
    showToast('启动下载失败: ' + errorMsg, 'error');
    isDownloading = false;
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('downloading');
  }
}

// ===== 加载下载历史 =====
async function loadHistory() {
  try {
    const files = await apiCall('get_downloads', { _endpoint: '/api/downloads' });

    if (!files || files.length === 0) {
      historyList.innerHTML = '<div class="history-empty">暂无下载记录</div>';
      return;
    }

    const typeIcon = (type) => type === 'audio' ?
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>' :
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>';

    historyList.innerHTML = files.map(file => `
      <div class="history-item">
        <span class="history-type-icon">${typeIcon(file.file_type)}</span>
        <span class="history-item-name">${file.filename}</span>
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
    historyList.innerHTML = '<div class="history-empty">加载失败</div>';
  }
}

// ===== 删除文件 =====
async function deleteFile(filename) {
  if (!confirm(`确定要删除 ${filename} 吗？`)) {
    return;
  }

  try {
    await apiCall('delete_file', {
      filename,
      _endpoint: `/api/files/${filename}`
    });
    showToast('文件已删除');
    loadHistory();
  } catch (error) {
    showToast('删除失败: ' + error.message, 'error');
  }
}

// ===== Tauri 事件监听 =====
if (isTauri && listen) {
  // 监听下载开始
  listen('download-started', (event) => {
    console.log('下载已启动:', event.payload);
  });

  // 监听下载完成
  listen('download-complete', (event) => {
    console.log('下载完成:', event.payload);
    isDownloading = false;
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('downloading');
    progressSection.classList.remove('active');
    completeSection.classList.add('active');
    showToast('下载完成！');
    loadHistory();
  });

  // 监听下载进度
  listen('download-progress', (event) => {
    const data = event.payload;
    console.log('下载进度:', data);

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

    downloadStatus.textContent = data.status || '下载中...';
  });

  // 监听错误
  listen('download-error', (event) => {
    const error = event.payload;
    console.error('下载错误:', error);
    isDownloading = false;
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('downloading');
    progressSection.classList.remove('active');
    showToast(error.error || '下载失败', 'error');
  });
}

// ===== 选项卡交互 =====
document.querySelectorAll('.option-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    card.querySelector('input').checked = true;
  });
});

document.querySelectorAll('.quality-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    btn.querySelector('input').checked = true;
  });
});

// ===== 事件监听 =====
console.log('绑定事件监听器...');
console.log('fetchBtn:', fetchBtn);
console.log('downloadBtn:', downloadBtn);
console.log('refreshBtn:', refreshBtn);

if (fetchBtn) {
  fetchBtn.addEventListener('click', () => {
    console.log('fetchBtn 被点击');
    fetchVideoInfo();
  });
}

if (downloadBtn) {
  downloadBtn.addEventListener('click', () => {
    console.log('downloadBtn 被点击');
    downloadVideo();
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', loadHistory);
}

urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    fetchVideoInfo();
  }
});

urlInput.addEventListener('input', () => {
  currentVideoInfo = null;
  videoCard.classList.remove('active');
});

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

// ===== 初始化应用 =====
async function initApp() {
  console.log('=== 初始化应用 ===');

  // Web 环境下初始化 Socket.IO
  if (!isTauri) {
    initSocketIO();
  }

  const particleCanvas = document.getElementById('particles');
  if (particleCanvas) {
    new ParticleSystem(particleCanvas).animate();
  }

  // 测试 Tauri API
  if (isTauri) {
    console.log('测试 Tauri API...');
    try {
      const debugInfo = await apiCall('get_debug_info', {});
      console.log('调试信息:', debugInfo);
      showToast('Tauri 就绪！工具路径: ' + debugInfo.ytdlp_path, 'success');
    } catch (error) {
      console.error('Tauri API 测试失败:', error);
      showToast('Tauri API 错误: ' + error, 'error');
    }
  } else {
    console.log('⚠ Web 模式 (部分功能可能不可用)');
  }

  loadHistory();

  const sections = document.querySelectorAll('[data-animate]');
  sections.forEach((section, index) => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    setTimeout(() => {
      section.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      section.style.opacity = '1';
      section.style.transform = 'translateY(0)';
    }, 100 * index);
  });
}

// ===== DOM 加载完成事件 =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== DOMContentLoaded ===');
  domReady = true;

  // 如果不是 Tauri 环境（或 Tauri 未检测到），直接初始化
  if (!isTauri && !window.__TAURI__) {
    setTimeout(() => {
      if (!isTauri) {
        console.log('Web 环境，直接初始化');
        initApp();
      }
    }, 500);
  }
});
})();

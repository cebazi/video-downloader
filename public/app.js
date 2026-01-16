// ===== Socket.IO 连接 =====
const socket = io();

// ===== DOM 元素 =====
const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const downloadBtn = document.getElementById('downloadBtn');
const refreshBtn = document.getElementById('refreshBtn');

const videoInfo = document.getElementById('videoInfo');
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
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    
    if (data.error) {
      showToast(data.error, 'error');
      return;
    }
    
    currentVideoInfo = data;
    
    // 显示视频信息
    videoThumbnail.style.backgroundImage = `url(${data.thumbnail})`;
    videoTitle.textContent = data.title;
    videoUploader.textContent = data.uploader;
    videoDuration.textContent = formatDuration(data.duration);
    videoInfo.style.display = 'flex';
    
  } catch (error) {
    showToast('获取视频信息失败', 'error');
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="2"/>
      </svg>
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
        body: JSON.stringify({ url })
      });

      const infoData = await infoResponse.json();

      if (infoData.error) {
        showToast(infoData.error, 'error');
        return;
      }

      // 保存视频信息
      currentVideoInfo = infoData;

      // 显示视频信息
      videoThumbnail.style.backgroundImage = `url(${infoData.thumbnail})`;
      videoTitle.textContent = infoData.title;
      videoUploader.textContent = infoData.uploader;
      videoDuration.textContent = formatDuration(infoData.duration);
      videoInfo.style.display = 'flex';

      showToast('视频信息已获取，开始下载...');

    } catch (error) {
      showToast('获取视频信息失败', 'error');
      return;
    }
  }

  // 开始下载
  isDownloading = true;
  downloadBtn.disabled = true;

  // 重置进度
  progressSection.style.display = 'block';
  completeSection.style.display = 'none';
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  downloadSpeed.textContent = '--';
  etaTime.textContent = '--';
  downloadStatus.textContent = '连接中...';

  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        quality,
        downloadType,
        socketId: socket.id
      })
    });

    const data = await response.json();

    if (data.error) {
      showToast(data.error, 'error');
      isDownloading = false;
      downloadBtn.disabled = false;
    }

  } catch (error) {
    showToast('启动下载失败', 'error');
    isDownloading = false;
    downloadBtn.disabled = false;
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

    const typeIcon = (type) => type === 'audio' ? '🎵' : '🎬';

    historyList.innerHTML = files.map(file => `
      <div class="history-item">
        <span class="history-type-icon">${typeIcon(file.type)}</span>
        <span class="history-item-name" onclick="downloadFile('${file.filename}')" title="点击下载">${file.filename}</span>
        <span class="history-item-size">${file.size}</span>
        <button class="history-delete" onclick="deleteFile('${file.filename}')" title="删除">✕</button>
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

  progressSection.style.display = 'none';
  completeSection.style.display = 'block';
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
  
  progressSection.style.display = 'none';
  showToast(data.error || '下载失败', 'error');
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
  videoInfo.style.display = 'none';
});

// ===== 初始化 =====
loadHistory();

// ===== 页面加载动画 =====
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  container.style.opacity = '0';
  container.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    container.style.transition = 'all 0.5s ease-out';
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  }, 100);
});

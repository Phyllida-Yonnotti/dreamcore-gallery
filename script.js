// 全局状态管理
let memories = [];
let currentIndex = 0;
let isPlaying = false;

// 页面 DOM 加载完成后统一初始化
window.addEventListener('DOMContentLoaded', () => {
  
  // 1. 开场遮罩：点击后向右平滑移出（开门）
  const splash = document.getElementById('splash-screen');
  if (splash) {
    // 监听用户的点击 / 触摸点击事件
    splash.addEventListener('click', () => {
      splash.classList.add('fade-out');
    });
  }

  // 2. 加载 data.json 记忆数据
  fetch('data.json')
    .then(response => {
      if (!response.ok) throw new Error("无法读取账本");
      return response.json();
    })
    .then(data => {
      memories = data;
      if (memories.length > 0) {
        updateMemoryView();
        console.log(`这张图是由 ${memories[0].by || '神秘人'} 载入的`);
      }
    })
    .catch(err => {
      console.error("加载失败: ", err);
    });

  // 3. 动态从 API 获取 thai/ 文件夹下的所有图片并渲染到画廊
  loadThaiGallery();
});

// 更新记忆图片与文案视图
function updateMemoryView() {
  const imgElement = document.getElementById('gallery');
  const captionElement = document.getElementById('caption');

  if (imgElement && memories[currentIndex]) {
    imgElement.style.opacity = 0.3;
    setTimeout(() => {
      imgElement.src = memories[currentIndex].url;
      if (captionElement) {
        captionElement.innerText = memories[currentIndex].text || '';
      }
      imgElement.style.opacity = 1;
    }, 150);
  }
}

// 切换下一段 / 上一段记忆
function changeMemory(direction) {
  if (memories.length === 0) return;

  currentIndex += direction;
  if (currentIndex >= memories.length) currentIndex = 0;
  if (currentIndex < 0) currentIndex = memories.length - 1;

  updateMemoryView();
}

// 控制背景音乐开关
function toggleMusic() {
  const bgm = document.getElementById('bgm');
  const musicBtn = document.getElementById('musicBtn');
  if (!bgm || !musicBtn) return;

  if (!isPlaying) {
    bgm.play().then(() => {
      isPlaying = true;
      musicBtn.innerText = "⏸ 暂停声音";
      bgm.playbackRate = 0.85;
    }).catch(err => {
      console.log("播放失败，需要用户交互:", err);
    });
  } else {
    bgm.pause();
    isPlaying = false;
    musicBtn.innerText = "🎵 播放声音";
  }
}

// 动态拉取画廊图片的网络请求
async function loadThaiGallery() {
  const gallery = document.getElementById('gallery-container');
  if (!gallery) return;

  gallery.innerHTML = '<p class="loading-text">// 正在提取记忆碎片...</p>';

  try {
    // 请求 api/blob-image-upload.js 接口，提取 Vercel Blob 里的图片
    const response = await fetch('/api/blob-image-upload');
    const data = await response.json();

    if (data.success && data.images.length > 0) {
      gallery.innerHTML = ''; // 清空加载提示
      
      // 遍历 Vercel Blob 返回的所有图片 URL 并动态创建图片标签
      data.images.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = "Thai Memory";
        img.loading = "lazy";
        img.classList.add('gallery-img');
        gallery.appendChild(img);
      });
    } else {
      gallery.innerHTML = '<p class="loading-text">未找到图片，请确认 thai/ 文件夹下是否有文件。</p>';
    }
  } catch (error) {
    console.error('加载图片失败:', error);
    gallery.innerHTML = '<p class="loading-text">✕ 数据拉取失败</p>';
  }
}
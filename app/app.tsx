---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
---

<Layout title="Is this a dream?">
  <!-- 🟢 0. 动态高斯模糊背景层 -->
  <div class="bg-blur-container">
    <img id="dynamic-bg" class="bg-blur-img" alt="Dynamic Background" />
    <div class="bg-overlay"></div>
  </div>

  <!-- 1. 开场全屏大图遮罩层 -->
  <div id="splash-screen">
    <!-- ⚠️ 换成你的公共图片 CDN 链接 -->
    <img src="https://hppuxb7qepdidfa2.public.blob.vercel-storage.com/parts/oiTru6Rwtjlsa.png" class="splash-img" alt="Intro" />
  </div>

  <!-- 2. 背景音乐 -->
  <audio id="bgm" src="https://<YOUR-PUBLIC-BLOB>.public.blob.vercel-storage.com/bgm.m4a" loop></audio>

  <div class="dream-text">
    -----------<br />
    jisichong
  </div>

  <!-- 3. 主窗口内容 -->
  <div class="window-container">
    <div class="window-header">
      <span>Memory_Viewer.exe</span>
      <button class="window-close" id="closeBtn">X</button>
    </div>

    <div class="window-body">
      <div class="photo-frame">
        <div id="gallery-container" class="gallery-grid">
          <img id="gallery" class="gallery-img" alt="Memory Image" style="display: none;" />
          <p id="loading-text" class="loading-text">正在提取记忆碎片...</p>
        </div>
        <div class="photo-caption" id="caption">这是你醒来前看到的最后一幕。</div>
      </div>

      <div class="nav-buttons">
        <button class="btn" id="prevBtn">◀ 上一段</button>
        <button class="btn" id="musicBtn">🎵 播放声音</button>
        <button class="btn" id="nextBtn">下一段 ▶</button>
      </div>

      <!-- 4. 图片上传区域 -->
      <form id="uploadForm" style="margin-top: 20px; text-align: center;">
        <input
          id="fileInput"
          name="file"
          type="file"
          accept="image/jpeg, image/png, image/webp"
          required
        />
        <button type="submit" class="btn">上传新记忆</button>
        <p id="uploadStatus" style="font-size: 12px; margin-top: 5px; color: #00ffcc;"></p>
      </form>
    </div>
  </div>
</Layout>

<!-- 🎨 样式写在这里 -->
<style>
  /* 动态模糊背景容器 */
  .bg-blur-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -2;
    overflow: hidden;
    background-color: #000000;
  }

  .bg-blur-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(35px) brightness(0.35) saturate(1.2);
    transform: scale(1.15);
    transition: opacity 0.3s ease;
    opacity: 0;
  }

  .bg-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.2);
    pointer-events: none;
  }

  .splash-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>

<!-- ⚡ Astro 的客户端 JS 脚本写在这里 -->
<script>
  let memories: { url: string; text: string }[] = [];
  let currentIndex = 0;
  let isPlaying = false;

  // 1. 从 API 加载列表
  async function loadThaiGallery() {
    try {
      const response = await fetch('/api/blob-image-upload');
      const data = await response.json();

      if (data.success && data.images.length > 0) {
        memories = data.images.map((url: string) => ({
          url,
          text: '这是你醒来前看到的最后一幕。',
        }));
        currentIndex = 0;
        updateMemoryView();
      }
    } catch (error) {
      console.error('加载图片失败:', error);
    }
  }

  // 2. 刷新页面上的图片和虚化背景
  function updateMemoryView() {
    const imgElement = document.getElementById('gallery') as HTMLImageElement;
    const bgImgElement = document.getElementById('dynamic-bg') as HTMLImageElement;
    const loadingText = document.getElementById('loading-text');

    if (memories[currentIndex]) {
      if (loadingText) loadingText.style.display = 'none';

      const currentUrl = memories[currentIndex].url;

      if (imgElement) {
        imgElement.style.display = 'block';
        imgElement.style.opacity = '0.3';
      }
      if (bgImgElement) bgImgElement.style.opacity = '0.3';

      setTimeout(() => {
        if (imgElement) {
          imgElement.src = currentUrl;
          imgElement.style.opacity = '1';
        }
        if (bgImgElement) {
          bgImgElement.src = currentUrl;
          bgImgElement.style.opacity = '1';
        }
      }, 150);
    }
  }

  // 3. 事件绑定
  document.addEventListener('DOMContentLoaded', () => {
    loadThaiGallery();

    // 点击遮罩移出
    document.getElementById('splash-screen')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).classList.add('fade-out');
    });

    // 关闭提示
    document.getElementById('closeBtn')?.addEventListener('click', () => {
      alert('你无法逃离这里。');
    });

    // 切换图片
    document.getElementById('prevBtn')?.addEventListener('click', () => {
      if (!memories.length) return;
      currentIndex = (currentIndex - 1 + memories.length) % memories.length;
      updateMemoryView();
    });

    document.getElementById('nextBtn')?.addEventListener('click', () => {
      if (!memories.length) return;
      currentIndex = (currentIndex + 1) % memories.length;
      updateMemoryView();
    });

    // 播放/暂停音乐
    const bgm = document.getElementById('bgm') as HTMLAudioElement;
    const musicBtn = document.getElementById('musicBtn');
    musicBtn?.addEventListener('click', () => {
      if (!isPlaying && bgm) {
        bgm.play().then(() => {
          isPlaying = true;
          bgm.playbackRate = 0.85;
          musicBtn.innerText = '⏸ 暂停声音';
        }).catch(err => console.log('播放受阻:', err));
      } else if (bgm) {
        bgm.pause();
        isPlaying = false;
        musicBtn.innerText = '🎵 播放声音';
      }
    });

    // 4. 处理图片上传
    const uploadForm = document.getElementById('uploadForm') as HTMLFormElement;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const uploadStatus = document.getElementById('uploadStatus');

    uploadForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!fileInput?.files?.[0]) {
        alert('请选择要上传的文件！');
        return;
      }

      const file = fileInput.files[0];
      if (uploadStatus) uploadStatus.innerText = '正在上传...';

      try {
        const response = await fetch(
          `/api/avatar/upload?filename=${encodeURIComponent(file.name)}`,
          {
            method: 'POST',
            body: file,
          }
        );

        if (response.ok) {
          if (uploadStatus) uploadStatus.innerText = '上传成功！';
          uploadForm.reset();
          // 重新拉取画廊
          await loadThaiGallery();
        } else {
          if (uploadStatus) uploadStatus.innerText = '上传失败';
        }
      } catch (error) {
        console.error('Upload Error:', error);
        if (uploadStatus) uploadStatus.innerText = '上传失败';
      }
    });
  });
</script>
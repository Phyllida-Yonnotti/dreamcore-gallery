async function loadThaiGallery() {
  const gallery = document.getElementById('gallery-container');
  if (!gallery) return;

  gallery.innerHTML = '<p class="loading-text">// 正在提取记忆碎片...</p>';

  try {
    // 确保这里的请求路径与你的 api/blob-image-upload.js 文件名完全匹配
    const response = await fetch('/api/blob-image-upload');
    const data = await response.json();

    if (data.success && data.images.length > 0) {
      gallery.innerHTML = ''; // 清空加载提示文字

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
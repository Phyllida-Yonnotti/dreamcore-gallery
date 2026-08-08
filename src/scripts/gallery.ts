let images: string[] = [];
let currentIndex = 0;

const splash = document.getElementById('splash')!;
const bgBlur = document.getElementById('bg-blur')!;
const mainImg = document.getElementById('main-img') as HTMLImageElement;
const prevBtn = document.getElementById('prev-btn')!;
const nextBtn = document.getElementById('next-btn')!;

// 1. 获取 thai 文件夹下的所有图片 URL
async function fetchImages() {
  try {
    const response = await fetch('/api/images');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    images = await response.json();

    console.log('加载到的图片列表:', images);

    if (Array.isArray(images) && images.length > 0) {
      updateDisplay(0);
    } else {
      console.warn('⚠️ 接口返回的图片列表为空，请检查 Blob 文件夹 prefix 是否匹配');
    }
  } catch (err) {
    console.error('❌ 无法从 API 加载图片:', err);
  }
}

// 2. 更新页面显示的图片和背景
function updateDisplay(index: number) {
  if (images.length === 0) return;
  
  currentIndex = (index + images.length) % images.length;
  const currentUrl = images[currentIndex];

  // 淡入淡出切换
  mainImg.style.opacity = '0.3';
  setTimeout(() => {
    mainImg.src = currentUrl;
    bgBlur.style.backgroundImage = `url('${currentUrl}')`;
    mainImg.style.opacity = '1';
  }, 150);
}

// 3. 点击图片 A 淡出退出
splash.addEventListener('click', () => {
  splash.classList.add('dismissed');
});

// 4. 按钮事件
prevBtn.addEventListener('click', () => {
  updateDisplay(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  updateDisplay(currentIndex + 1);
});

// 页面加载完成后拉取图片
fetchImages();
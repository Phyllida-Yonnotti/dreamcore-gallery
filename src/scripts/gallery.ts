import { gsap } from 'gsap';

let images: string[] = [];
let currentIndex = 0;

const splash = document.getElementById('splash')!;
const bgBlur = document.getElementById('bg-blur')!;
const mainImg = document.getElementById('main-img') as HTMLImageElement;
const prevBtn = document.getElementById('prev-btn')!;
const nextBtn = document.getElementById('next-btn')!;
const subtitle = document.querySelector('.subtitle-container') as HTMLElement;

// 1. 从 API 获取图片列表
async function fetchImages() {
  try {
    const response = await fetch('/api/images');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    images = await response.json();

    if (Array.isArray(images) && images.length > 0) {
      updateDisplay(0, true); // 首次加载不显示过度动画
    } else {
      console.warn('⚠️ 接口返回的图片列表为空，请检查 Blob 文件夹 prefix 是否匹配');
    }
  } catch (err) {
    console.error('❌ 无法从 API 加载图片:', err);
  }
}

// 2. 使用 GSAP 平滑更新页面图片和背景
function updateDisplay(index: number, isInitial = false) {
  if (images.length === 0) return;
  
  currentIndex = (index + images.length) % images.length;
  const currentUrl = images[currentIndex];

  if (isInitial) {
    mainImg.src = currentUrl;
    bgBlur.style.backgroundImage = `url('${currentUrl}')`;
    return;
  }

  // 💡 将动画对象从 mainImg 改为 '.image-wrapper'
  // 让整个相框容器（带阴影）一起微微缩小，就不会在内部露出黑框了
  gsap.to('.image-wrapper', {
    opacity: 0.4,
    scale: 0.95,
    duration: 0.18,
    ease: 'power1.out',
    onComplete: () => {
      mainImg.src = currentUrl;
      bgBlur.style.backgroundImage = `url('${currentUrl}')`;

      gsap.to('.image-wrapper', {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  });
}

// 3. 点击铁门：GSAP 模拟厚重铁门向右推开 + 照片弹出动画
splash.addEventListener('click', () => {
  // 1. 铁门向右滑动并淡出
  gsap.to(splash, {
    x: '100vw',
    opacity: 0,
    duration: 1.8,
    ease: 'power3.inOut',
    onComplete: () => {
      splash.style.display = 'none'; // 动画结束后卸载点击拦截
    }
  });

  // 2. 推开门的同时，中间的照片从缩小微弹变大出现（电影感入场）
  gsap.fromTo('.image-wrapper', 
    { scale: 0.85, opacity: 0 },
    { scale: 1, opacity: 1, duration: 1.2, delay: 0.3, ease: 'back.out(1.4)' }
  );

  // 3. 手写字同时轻轻浮现
  if (subtitle) {
    gsap.fromTo(subtitle,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, delay: 0.5, ease: 'power2.out' }
    );
  }
});

// 4. 按钮切换事件
prevBtn.addEventListener('click', () => {
  updateDisplay(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  updateDisplay(currentIndex + 1);
});

// 初始化拉取数据
fetchImages();
import { gsap } from 'gsap';

let images: string[] = [];
let currentIndex = 0;

const splash = document.getElementById('splash')!;
const mainImg = document.getElementById('main-img') as HTMLImageElement;
const prevBtn = document.getElementById('prev-btn')!;
const nextBtn = document.getElementById('next-btn')!;
const subtitle = document.querySelector('.subtitle-container') as HTMLElement;

// 1. 获取图片列表
async function fetchImages() {
  try {
    const response = await fetch('/api/images');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    images = await response.json();

    if (Array.isArray(images) && images.length > 0) {
      updateDisplay(0, true);
    }
  } catch (err) {
    console.error('❌ 无法从 API 加载图片:', err);
  }
}

// 2. 更新页面图片（不再动态修改背景）
function updateDisplay(index: number, isInitial = false) {
  if (images.length === 0) return;
  
  currentIndex = (index + images.length) % images.length;
  const currentUrl = images[currentIndex];

  if (isInitial) {
    mainImg.src = currentUrl;
    return;
  }

  gsap.to('.image-wrapper', {
    opacity: 0.4,
    scale: 0.95,
    duration: 0.18,
    ease: 'power1.out',
    onComplete: () => {
      mainImg.src = currentUrl; // 👈 仅切换相框内的原图

      gsap.to('.image-wrapper', {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  });
}

// 3. 点击铁门推开
splash.addEventListener('click', () => {
  gsap.to(splash, {
    x: '100vw',
    opacity: 0,
    duration: 1.8,
    ease: 'power3.inOut',
    onComplete: () => {
      splash.style.display = 'none';
    }
  });

  gsap.fromTo('.image-wrapper', 
    { scale: 0.85, opacity: 0 },
    { scale: 1, opacity: 1, duration: 1.2, delay: 0.3, ease: 'back.out(1.4)' }
  );

  if (subtitle) {
    gsap.fromTo(subtitle,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, delay: 0.5, ease: 'power2.out' }
    );
  }
});

// 4. 按钮事件
prevBtn.addEventListener('click', () => updateDisplay(currentIndex - 1));
nextBtn.addEventListener('click', () => updateDisplay(currentIndex + 1));

fetchImages();
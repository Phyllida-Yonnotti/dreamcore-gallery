import { gsap } from 'gsap';

// 1. 定义图片数据接口
interface ImageItem {
  id: string | number;
  img_url: string;
  count: number;
}

let images: ImageItem[] = [];
let currentIndex = 0;

const splash = document.getElementById('splash')!;
const splashHint = document.getElementById('splash-hint')!;
const canvas = document.getElementById('water-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const mainImg = document.getElementById('main-img') as HTMLImageElement;
const prevBtn = document.getElementById('prev-btn')!;
const nextBtn = document.getElementById('next-btn')!;
const subtitle = document.querySelector('.subtitle-container') as HTMLElement;

// 点赞相关 DOM 元素
const likeCheckbox = document.getElementById('like-checkbox') as HTMLInputElement;
const likeCountEl = document.getElementById('like-count');

let isReadyToOpen = false; // 标记首张图是否完全加载完成
let isAnimating = false;  // 状态锁：防止快速滑动导致动画重叠

// ========================================================
// 水光涟漪引擎
// ========================================================
interface WaterRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  lineWidth: number;
  speed: number;
}

interface WaterGlow {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

let rings: WaterRing[] = [];
let glows: WaterGlow[] = [];
let animId: number;
let isOpening = false;
let ambientTimer = 0;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createRipple(x: number, y: number, isClick = false) {
  const count = isClick ? 3 : 1;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      rings.push({
        x,
        y,
        radius: isClick ? 10 : 2,
        maxRadius: isClick ? 180 + i * 40 : 50,
        alpha: isClick ? 0.45 : 0.2,
        lineWidth: isClick ? 1.0 : 0.6,
        speed: isClick ? 3.5 + i * 0.8 : 1.2
      });
    }, i * 120);
  }

  if (isClick) {
    glows.push({ x, y, radius: 10, alpha: 0.25 });
  }
}

function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ambientTimer++;
  if (!isOpening && ambientTimer % 180 === 0) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    createRipple(rx, ry, false);
  }

  for (let i = glows.length - 1; i >= 0; i--) {
    const g = glows[i];
    const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${g.alpha})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    g.radius += 2.5;
    g.alpha -= 0.008;

    if (g.alpha <= 0) glows.splice(i, 1);
  }

  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];

    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha})`;
    ctx.lineWidth = r.lineWidth;
    ctx.stroke();

    r.radius += r.speed;
    r.lineWidth = Math.max(0.2, r.lineWidth - 0.005);
    r.alpha -= 0.006;

    if (r.alpha <= 0 || r.radius >= r.maxRadius) {
      rings.splice(i, 1);
    }
  }

  animId = requestAnimationFrame(renderFrame);
}

renderFrame();

// ========================================================
// 点击水面开场
// ========================================================
splash.addEventListener('click', (e: MouseEvent) => {
  if (!isReadyToOpen) {
    createRipple(e.clientX, e.clientY, false);
    return;
  }

  if (isOpening) return;
  isOpening = true;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  createRipple(clickX, clickY, true);

  gsap.to(splash, {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    duration: 1.0,
    delay: 0.15,
    ease: 'power2.inOut',
    onComplete: () => {
      splash.style.display = 'none';
      cancelAnimationFrame(animId);
    }
  });

  gsap.fromTo('.image-wrapper',
    { scale: 0.95, opacity: 0, filter: 'blur(6px)' },
    { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.1, delay: 0.25, ease: 'power2.out' }
  );

  gsap.fromTo('.top-banner-container',
    { y: -25, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.0, delay: 0.3, ease: 'power2.out' }
  );

  if (subtitle) {
    gsap.fromTo(subtitle,
      { y: -15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, delay: 0.35, ease: 'power2.out' }
    );
  }
});

// ========================================================
// 画廊 API 与预加载逻辑
// ========================================================
async function fetchImages() {
  try {
    if (splashHint) splashHint.innerHTML = "静水沉淀中...";
    if (mainImg) mainImg.style.opacity = '0';

    const response = await fetch('/gallery-api/images');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    images = await response.json();

    if (Array.isArray(images) && images.length > 0) {
      const currentItem = images[currentIndex];

      const firstImg = new Image();
      firstImg.src = currentItem.img_url; // 取 img_url

      const onFirstLoad = () => {
        mainImg.src = currentItem.img_url;
        
        // 同步首张图的点赞数 UI
        if (likeCountEl) likeCountEl.textContent = currentItem.count.toString();
        if (likeCheckbox) likeCheckbox.checked = false;

        gsap.to(mainImg, { opacity: 1, duration: 0.4 });

        isReadyToOpen = true;
        if (splashHint) splashHint.innerHTML = "点击静水 · 开启画廊";
        preloadAdjacentImages();
      };

      if (firstImg.complete) {
        onFirstLoad();
      } else {
        firstImg.onload = onFirstLoad;
      }
    }
  } catch (err) {
    console.error('❌ 无法从 API 加载图片:', err);
    if (splashHint) splashHint.innerHTML = "点击静水 · 开启画廊";
  }
}

function preloadAdjacentImages() {
  if (images.length <= 1) return;
  const nextIndex = (currentIndex + 1) % images.length;
  const prevIndex = (currentIndex - 1 + images.length) % images.length;

  const imgNext = new Image();
  imgNext.src = images[nextIndex].img_url; // 取 img_url
  const imgPrev = new Image();
  imgPrev.src = images[prevIndex].img_url; // 取 img_url
}

// ========================================================
// 桌面端：渐隐平滑切图逻辑
// ========================================================
function updateDisplay(
  index: number,
  isInitial = false,
  direction: 'next' | 'prev' = 'next'
) {
  if (images.length === 0 || isAnimating) return;
  isAnimating = true;

  currentIndex = (index + images.length) % images.length;
  const currentItem = images[currentIndex];
  const currentUrl = currentItem.img_url;

  // 刷新当前图的点赞 UI 状态
  if (likeCountEl) likeCountEl.textContent = currentItem.count.toString();
  if (likeCheckbox) likeCheckbox.checked = false;

  if (isInitial) {
    mainImg.src = currentUrl;
    preloadAdjacentImages();
    isAnimating = false;
    return;
  }

  gsap.to('.image-wrapper', {
    opacity: 0.2,
    scale: 0.98,
    duration: 0.15,
    ease: 'power1.in',
    onComplete: () => {
      const tempImg = new Image();
      tempImg.src = currentUrl;

      const renderNewImage = () => {
        mainImg.src = currentUrl;

        gsap.fromTo('.image-wrapper',
          { opacity: 0.2, scale: 0.98 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.28,
            ease: 'power2.out',
            onComplete: () => {
              isAnimating = false;
              preloadAdjacentImages();
            }
          }
        );
      };

      if (tempImg.complete) {
        renderNewImage();
      } else {
        tempImg.onload = renderNewImage;
      }
    }
  });
}

// ========================================================
// 手机端：镜头穿梭 + 四角拨叶切换逻辑
// ========================================================
function updateDisplayWithLeafAnimation(
  newIndex: number,
  direction: 'next' | 'prev'
) {
  if (images.length === 0 || isAnimating) return;
  isAnimating = true;

  currentIndex = (newIndex + images.length) % images.length;
  const currentItem = images[currentIndex];
  const nextImageUrl = currentItem.img_url;

  // 刷新当前图的点赞 UI 状态
  if (likeCountEl) likeCountEl.textContent = currentItem.count.toString();
  if (likeCheckbox) likeCheckbox.checked = false;

  const tl = gsap.timeline({
    onComplete: () => {
      isAnimating = false;
      preloadAdjacentImages();
    }
  });

  if (direction === 'next') {
    tl.to('.leaf-tl', { x: '-60%', y: '-60%', scale: 1.4, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0)
      .to('.leaf-tr', { x: '60%', y: '-60%', scale: 1.4, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0)
      .to('.leaf-bl', { x: '-60%', y: '60%', scale: 1.4, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0)
      .to('.leaf-br', { x: '60%', y: '60%', scale: 1.4, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0);

    tl.to('.image-wrapper', {
      scale: 1.08,
      opacity: 0.2,
      duration: 0.25,
      ease: 'power1.in',
      onComplete: () => { mainImg.src = nextImageUrl; }
    }, 0.05);

    tl.fromTo('.image-wrapper', 
      { scale: 0.92, opacity: 0.2 },
      { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' },
      0.3
    );

    tl.fromTo('.leaf-item',
      { x: '0%', y: '0%', scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.2)', stagger: 0.03 },
      0.35
    );

  } else {
    tl.to('.leaf-item', { opacity: 0, scale: 0.7, duration: 0.25, ease: 'power1.in' }, 0);

    tl.to('.image-wrapper', {
      scale: 0.92,
      opacity: 0.2,
      duration: 0.25,
      ease: 'power1.in',
      onComplete: () => { mainImg.src = nextImageUrl; }
    }, 0.05);

    tl.fromTo('.image-wrapper',
      { scale: 1.08, opacity: 0.2 },
      { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' },
      0.3
    );

    tl.fromTo('.leaf-tl', { x: '-60%', y: '-60%', scale: 1.3, opacity: 0 }, { x: '0%', y: '0%', scale: 1, opacity: 1, duration: 0.4 }, 0.3)
      .fromTo('.leaf-tr', { x: '60%', y: '-60%', scale: 1.3, opacity: 0 }, { x: '0%', y: '0%', scale: 1, opacity: 1, duration: 0.4 }, 0.3)
      .fromTo('.leaf-bl', { x: '-60%', y: '60%', scale: 1.3, opacity: 0 }, { x: '0%', y: '0%', scale: 1, opacity: 1, duration: 0.4 }, 0.3)
      .fromTo('.leaf-br', { x: '60%', y: '60%', scale: 1.3, opacity: 0 }, { x: '0%', y: '0%', scale: 1, opacity: 1, duration: 0.4 }, 0.3);
  }
}

// ========================================================
// 🕹️ 交互绑定
// ========================================================

function changeSlide(direction: 'next' | 'prev') {
  const isMobile = window.innerWidth <= 768;
  const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

  if (isMobile) {
    updateDisplayWithLeafAnimation(targetIndex, direction);
  } else {
    updateDisplay(targetIndex, false, direction);
  }
}

prevBtn.addEventListener('click', () => changeSlide('prev'));
nextBtn.addEventListener('click', () => changeSlide('next'));

let touchStartY = 0;
let touchStartX = 0;

window.addEventListener('touchstart', (e: TouchEvent) => {
  if (!isOpening) return;
  touchStartY = e.changedTouches[0].clientY;
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e: TouchEvent) => {
  if (!isOpening) return;
  const touchEndY = e.changedTouches[0].clientY;
  const touchEndX = e.changedTouches[0].clientX;

  const deltaY = touchStartY - touchEndY;
  const deltaX = Math.abs(touchStartX - touchEndX);
  const minSwipeDistance = 35;

  if (Math.abs(deltaY) > minSwipeDistance && Math.abs(deltaY) > deltaX) {
    if (deltaY > 0) {
      changeSlide('next');
    } else {
      changeSlide('prev');
    }
  }
}, { passive: true });

// 初始化加载图片列表
fetchImages();

// ========================================================
// ❤️ 单图独立点赞功能
// ========================================================
if (likeCheckbox) {
  likeCheckbox.addEventListener('change', async () => {
    if (likeCheckbox.checked && images[currentIndex]) {
      const currentItem = images[currentIndex];

      try {
        const res = await fetch('/api/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentItem.id }) // 发送当前图片的 ID
        });

        if (res.ok) {
          const data = await res.json();
          if (data.count !== undefined) {
            currentItem.count = data.count; // 同步内存中的数据
            if (likeCountEl) likeCountEl.textContent = data.count.toString();
          }
        }
      } catch (err) {
        console.error('点赞失败:', err);
      }
    }
  });
}
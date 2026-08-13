import { gsap } from 'gsap';

let images: string[] = [];
let currentIndex = 0;

const splash = document.getElementById('splash')!;
const splashHint = document.getElementById('splash-hint')!;
const canvas = document.getElementById('water-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const mainImg = document.getElementById('main-img') as HTMLImageElement;
const prevBtn = document.getElementById('prev-btn')!;
const nextBtn = document.getElementById('next-btn')!;
const subtitle = document.querySelector('.subtitle-container') as HTMLElement;

let isReadyToOpen = false; // 标记首张图是否完全加载完成

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
  // 如果首张图片还没完全下载完毕，不许开场
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

  // BANNER平滑入场
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
// 画廊 API 与无缝预加载逻辑
// ========================================================
async function fetchImages() {
  try {
    if (splashHint) splashHint.innerHTML = "静水沉淀中...";

    const response = await fetch('/api/images');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    images = await response.json();

    if (Array.isArray(images) && images.length > 0) {
      // 预加载第一张图，确保加载完才允许开启水面
      const firstImg = new Image();
      firstImg.src = images[0];
      
      const onFirstLoad = () => {
        mainImg.src = images[0];
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
  imgNext.src = images[nextIndex];
  const imgPrev = new Image();
  imgPrev.src = images[prevIndex];
}

/**
 * 切换图片：先后台加载，完全就绪后再淡入
 */
function updateDisplay(
  index: number, 
  isInitial = false, 
  isMobileSwipe = false, 
  direction: 'next' | 'prev' = 'next'
) {
  if (images.length === 0) return;  
  currentIndex = (index + images.length) % images.length;
  const currentUrl = images[currentIndex];

  if (isInitial) {
    mainImg.src = currentUrl;
    preloadAdjacentImages();
    return;
  }

  // 先旧图淡出
  const exitY = isMobileSwipe ? (direction === 'next' ? -30 : 30) : 0;
  const enterY = isMobileSwipe ? (direction === 'next' ? 30 : -30) : 0;

  gsap.to('.image-wrapper', {
    opacity: 0.2,
    y: exitY,
    scale: isMobileSwipe ? 1 : 0.98,
    duration: 0.15,
    ease: 'power1.in',
    onComplete: () => {
      // 💡 关键：使用内存 Image 对象确保图片下载 100% 完成后再替换主图
      const tempImg = new Image();
      tempImg.src = currentUrl;

      const renderNewImage = () => {
        mainImg.src = currentUrl;

        gsap.fromTo('.image-wrapper',
          { opacity: 0.2, y: enterY, scale: isMobileSwipe ? 1 : 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.28,
            ease: 'power2.out',
            onComplete: () => preloadAdjacentImages()
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

// 桌面端点击按钮
prevBtn.addEventListener('click', () => updateDisplay(currentIndex - 1, false, false, 'prev'));
nextBtn.addEventListener('click', () => updateDisplay(currentIndex + 1, false, false, 'next'));

// 手机端：上下滑动
let touchStartY = 0;
let touchStartX = 0;
let touchEndY = 0;
let touchEndX = 0;

window.addEventListener('touchstart', (e: TouchEvent) => {
  if (!isOpening) return;
  touchStartY = e.changedTouches[0].clientY;
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e: TouchEvent) => {
  if (!isOpening) return;
  touchEndY = e.changedTouches[0].clientY;
  touchEndX = e.changedTouches[0].clientX;
  handleSwipeGesture();
}, { passive: true });

function handleSwipeGesture() {
  const deltaY = touchStartY - touchEndY;
  const deltaX = Math.abs(touchStartX - touchEndX);
  const minSwipeDistance = 40;

  if (Math.abs(deltaY) > minSwipeDistance && Math.abs(deltaY) > deltaX) {
    if (deltaY > 0) {
      updateDisplay(currentIndex + 1, false, true, 'next');
    } else {
      updateDisplay(currentIndex - 1, false, true, 'prev');
    }
  }
}

fetchImages();

let isAnimating = false; // 防止滑动太快导致动画叠加卡顿

/**
 * 核心动画：叶子拨开 -> 图片滑动(正向/反向) -> 叶子弹性复位
 */
function updateDisplayWithLeafAnimation(
  newIndex: number, 
  direction: 'next' | 'prev'
) {
  if (images.length === 0 || isAnimating) return;
  isAnimating = true;

  currentIndex = (newIndex + images.length) % images.length;
  const nextImageUrl = images[currentIndex];

  // 方向判断：上滑(next)照片向上飞出/下方切入；下滑(prev)照片向下飞出/上方切入
  const exitY = direction === 'next' ? -60 : 60;
  const enterY = direction === 'next' ? 60 : -60;

  // 创建 GSAP 连贯动画时间线
  const tl = gsap.timeline({
    onComplete: () => {
      isAnimating = false;
      preloadAdjacentImages();
    }
  });

  // 阶段 1：两片叶子像被手拨开一样，向两侧旋转开（0.3秒）
  tl.to('.leaf-left', {
    rotation: -42,
    x: '-35%',
    y: 15,
    duration: 0.3,
    ease: 'power2.out'
  }, 0)
  .to('.leaf-right', {
    rotation: 42,
    x: '35%',
    y: 15,
    duration: 0.3,
    ease: 'power2.out'
  }, 0);

  // 阶段 2：旧图片随着手势方向滑出（0.2秒）
  tl.to('.image-wrapper', {
    y: exitY,
    opacity: 0.3,
    duration: 0.2,
    ease: 'power1.in',
    onComplete: () => {
      // 切换新图片地址
      mainImg.src = nextImageUrl;
    }
  }, 0.1);

  // 阶段 3：新图片从反方向滑入就位（0.35秒）
  tl.fromTo('.image-wrapper', 
    { y: enterY, opacity: 0.3 },
    { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' },
    0.3
  );

  // 阶段 4：叶子带着自然弹性（back.out）松手回弹复位，重新盖住照片边缘（0.45秒）
  tl.to('.leaf-left', {
    rotation: 0,
    x: '0%',
    y: 0,
    duration: 0.45,
    ease: 'back.out(1.5)'
  }, 0.35)
  .to('.leaf-right', {
    rotation: 0,
    x: '0%',
    y: 0,
    duration: 0.45,
    ease: 'back.out(1.5)'
  }, 0.35);
}

// ========================================================
// 手机端：手势滑动监听 (上下划)
// ========================================================
let touchStartY = 0;
let touchStartX = 0;

window.addEventListener('touchstart', (e: TouchEvent) => {
  touchStartY = e.changedTouches[0].clientY;
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e: TouchEvent) => {
  const touchEndY = e.changedTouches[0].clientY;
  const touchEndX = e.changedTouches[0].clientX;
  
  const deltaY = touchStartY - touchEndY;
  const deltaX = Math.abs(touchStartX - touchEndX);
  const minSwipeDistance = 35; // 触发划动的最小距离

  // 确保是垂直方向的划动
  if (Math.abs(deltaY) > minSwipeDistance && Math.abs(deltaY) > deltaX) {
    if (deltaY > 0) {
      // 👆 向上滑动 -> 下一张 (next)
      updateDisplayWithLeafAnimation(currentIndex + 1, 'next');
    } else {
      // 👇 向下滑动 -> 上一张 (prev)
      updateDisplayWithLeafAnimation(currentIndex - 1, 'prev');
    }
  }
}, { passive: true });

// 桌面端按钮联动（同样享受拨叶动画）
prevBtn.addEventListener('click', () => updateDisplayWithLeafAnimation(currentIndex - 1, 'prev'));
nextBtn.addEventListener('click', () => updateDisplayWithLeafAnimation(currentIndex + 1, 'next'));
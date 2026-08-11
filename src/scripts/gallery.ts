import { gsap } from 'gsap';

let images: string[] = [];
let currentIndex = 0;

const splash = document.getElementById('splash')!;
const canvas = document.getElementById('water-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const mainImg = document.getElementById('main-img') as HTMLImageElement;
const prevBtn = document.getElementById('prev-btn')!;
const nextBtn = document.getElementById('next-btn')!;
const subtitle = document.querySelector('.subtitle-container') as HTMLElement;
const galleryContainer = document.querySelector('.gallery-container') as HTMLElement;

// ========================================================
// 🪶 微羽级水光涟漪引擎
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
// 🖱️ 点击水面：灵动触碰 + 优雅开场
// ========================================================
splash.addEventListener('click', (e: MouseEvent) => {
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
    { scale: 0.92, opacity: 0, filter: 'blur(6px)' },
    { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.1, delay: 0.25, ease: 'power2.out' }
  );

  if (subtitle) {
    gsap.fromTo(subtitle,
      { y: -15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, delay: 0.35, ease: 'power2.out' }
    );
  }
});

// ========================================================
// 画廊 API 与动态上下滑动切换逻辑
// ========================================================
async function fetchImages() {
  try {
    const response = await fetch('/api/images');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    images = await response.json();

    if (Array.isArray(images) && images.length > 0) {
      updateDisplay(0, true);
    }
  } catch (err) {
    console.error('❌ 无法从 API 加载图片:', err);
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
 * 切换图片并播放垂直滑动动画
 * @param index 目标图片索引
 * @param isInitial 是否是初次加载
 * @param direction 'next' (向上滑动/后一张) | 'prev' (向下滑动/前一张)
 */
function updateDisplay(index: number, isInitial = false, direction: 'next' | 'prev' = 'next') {
  if (images.length === 0) return;
  
  currentIndex = (index + images.length) % images.length;
  const currentUrl = images[currentIndex];

  if (isInitial) {
    mainImg.src = currentUrl;
    preloadAdjacentImages();
    return;
  }

  // 根据方向决定滑出与滑入的偏移距离
  const exitY = direction === 'next' ? -60 : 60;  // next: 向上推出；prev: 向下推出
  const enterY = direction === 'next' ? 60 : -60; // next: 从下钻出；prev: 从上钻出

  gsap.to('.image-wrapper', {
    opacity: 0,
    y: exitY,
    scale: 0.94,
    duration: 0.2,
    ease: 'power1.in',
    onComplete: () => {
      mainImg.src = currentUrl;

      gsap.fromTo('.image-wrapper',
        { opacity: 0, y: enterY, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.35,
          ease: 'power2.out',
          onComplete: () => preloadAdjacentImages()
        }
      );
    }
  });
}

// 按钮点击处理
prevBtn.addEventListener('click', () => updateDisplay(currentIndex - 1, false, 'prev'));
nextBtn.addEventListener('click', () => updateDisplay(currentIndex + 1, false, 'next'));

// ========================================================
// 📱 手机端：上下滑动 (Vertical Touch Swipe) 监听
// ========================================================
let touchStartY = 0;
let touchStartX = 0;
let touchEndY = 0;
let touchEndX = 0;

// 监听整个 window 或图片区域，开场屏结束后生效
window.addEventListener('touchstart', (e: TouchEvent) => {
  if (!isOpening) return; // 未开场时不触发滑图
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
  const deltaY = touchStartY - touchEndY; // > 0 说明向上滑动，< 0 说明向下滑动
  const deltaX = Math.abs(touchStartX - touchEndX);
  const minSwipeDistance = 45; // 触发切换的最小滑动距离 (px)

  // 确保主方向是纵向滑动（防止左右误触）
  if (Math.abs(deltaY) > minSwipeDistance && Math.abs(deltaY) > deltaX) {
    if (deltaY > 0) {
      // 向上滑动 -> 下一张 (next)
      updateDisplay(currentIndex + 1, false, 'next');
    } else {
      // 向下滑动 -> 上一张 (prev)
      updateDisplay(currentIndex - 1, false, 'prev');
    }
  }
}

fetchImages();
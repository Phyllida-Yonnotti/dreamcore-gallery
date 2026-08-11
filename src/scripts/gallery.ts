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
// 🖱️ 点击水面开场
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
    { scale: 0.95, opacity: 0, filter: 'blur(6px)' },
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
// 🎨 画廊 API 与双端差异化切换逻辑
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
 * 切换图片显示
 * @param isMobileSwipe 是否来源于手机滑动手势
 * @param direction 手势方向
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

  if (isMobileSwipe) {
    // 📱 手机端：适度的垂直流动滑入
    const exitY = direction === 'next' ? -30 : 30;
    const enterY = direction === 'next' ? 30 : -30;

    gsap.to('.image-wrapper', {
      opacity: 0,
      y: exitY,
      duration: 0.16,
      ease: 'power1.in',
      onComplete: () => {
        mainImg.src = currentUrl;
        gsap.fromTo('.image-wrapper',
          { opacity: 0, y: enterY },
          {
            opacity: 1,
            y: 0,
            duration: 0.28,
            ease: 'power2.out',
            onComplete: () => preloadAdjacentImages()
          }
        );
      }
    });
  } else {
    // 💻 桌面端：极简微拉伸与虚化淡入（无大幅度位移，柔和高级）
    gsap.to('.image-wrapper', {
      opacity: 0.3,
      scale: 0.98,
      duration: 0.15,
      ease: 'power1.out',
      onComplete: () => {
        mainImg.src = currentUrl;

        gsap.to('.image-wrapper', {
          opacity: 1,
          scale: 1,
          duration: 0.25,
          ease: 'power2.out',
          onComplete: () => preloadAdjacentImages()
        });
      }
    });
  }
}

// 桌面端点击按钮（只传入桌面切换逻辑）
prevBtn.addEventListener('click', () => updateDisplay(currentIndex - 1, false, false, 'prev'));
nextBtn.addEventListener('click', () => updateDisplay(currentIndex + 1, false, false, 'next'));

// ========================================================
// 📱 手机端：上下滑动手势监听
// ========================================================
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
      // 向上滑动 -> 下一张
      updateDisplay(currentIndex + 1, false, true, 'next');
    } else {
      // 向下滑动 -> 上一张
      updateDisplay(currentIndex - 1, false, true, 'prev');
    }
  }
}

fetchImages();
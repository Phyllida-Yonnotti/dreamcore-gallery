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
      firstImg.src = currentItem.img_url;

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
  imgNext.src = images[nextIndex].img_url;
  const imgPrev = new Image();
  imgPrev.src = images[prevIndex].img_url;
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
// 手机端：树叶联动 + 干脆利落切图逻辑
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

  // 刷新点赞 UI
  if (likeCountEl) likeCountEl.textContent = currentItem.count.toString();
  if (likeCheckbox) likeCheckbox.checked = false;

  // 树叶分组：左侧三片 (9, 10, 11) 与 右侧三片 (12, 13, 14)
  const leftLeaves = '.leaf-top-9, .leaf-top-10, .leaf-top-11';
  const rightLeaves = '.leaf-top-12, .leaf-top-13, .leaf-top-14';

  const tl = gsap.timeline({
    onComplete: () => {
      isAnimating = false;
      preloadAdjacentImages();
    }
  });

  if (direction === 'next') {
    // ----------------------------------------------------
    // 【向上滑动 / 下一张】：树叶向上方拨开，图片快速向上消失
    // ----------------------------------------------------

    // 1. 树叶向两侧上方飘开
    tl.to(leftLeaves, { y: -70, x: -40, opacity: 0, duration: 0.28, ease: 'power2.in' }, 0);
    tl.to(rightLeaves, { y: -70, x: 40, opacity: 0, duration: 0.28, ease: 'power2.in' }, 0);

    // 2. 旧图片迅速向上淡出 (0.2s 极速，不卡顿)
    tl.to('.image-wrapper', {
      y: -50,
      opacity: 0,
      scale: 0.94,
      duration: 0.20,
      ease: 'power1.in',
      onComplete: () => { mainImg.src = nextImageUrl; }
    }, 0);

    // 3. 新图片从下方轻盈推入
    tl.fromTo('.image-wrapper',
      { y: 50, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'power2.out' },
      0.22
    );

    // 4. 树叶从上方优雅飘落归位，并在完成后清除内联属性以恢复 CSS 摇摆
    tl.fromTo('.leaf-item',
      { y: -40, opacity: 0 },
      {
        y: 0,
        opacity: 0.92,
        duration: 0.38,
        ease: 'back.out(1.2)',
        stagger: 0.03,
        clearProps: 'transform,opacity'
      },
      0.28
    );

  } else {
    // ----------------------------------------------------
    // 【向下滑动 / 上一张】：树叶反向向下散开，图片向下消失
    // ----------------------------------------------------

    // 1. 树叶向两侧下方散开 (反向)
    tl.to(leftLeaves, { y: 60, x: -35, opacity: 0, duration: 0.28, ease: 'power2.in' }, 0);
    tl.to(rightLeaves, { y: 60, x: 35, opacity: 0, duration: 0.28, ease: 'power2.in' }, 0);

    // 2. 旧图片迅速向下淡出
    tl.to('.image-wrapper', {
      y: 50,
      opacity: 0,
      scale: 0.94,
      duration: 0.20,
      ease: 'power1.in',
      onComplete: () => { mainImg.src = nextImageUrl; }
    }, 0);

    // 3. 新图片从上方掉落进来
    tl.fromTo('.image-wrapper',
      { y: -50, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'power2.out' },
      0.22
    );

    // 4. 树叶反向复位归位
    tl.fromTo('.leaf-item',
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 0.92,
        duration: 0.38,
        ease: 'back.out(1.2)',
        stagger: 0.03,
        clearProps: 'transform,opacity'
      },
      0.28
    );
  }
}

// ========================================================
// 交互绑定
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
      changeSlide('next'); // 上滑 -> 下一张
    } else {
      changeSlide('prev'); // 下滑 -> 上一张
    }
  }
}, { passive: true });

// 初始化加载图片列表
fetchImages();

// ========================================================
// 单图独立点赞功能
// ========================================================
if (likeCheckbox) {
  likeCheckbox.addEventListener('change', async () => {
    if (likeCheckbox.checked && images[currentIndex]) {
      const currentItem = images[currentIndex];

      try {
        const res = await fetch('/gallery-api/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentItem.id })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.count !== undefined) {
            currentItem.count = data.count;
            if (likeCountEl) likeCountEl.textContent = data.count.toString();
          }
        }
      } catch (err) {
        console.error('点赞失败:', err);
      }
    }
  });
}

const isDesktop = window.matchMedia('(pointer: fine)').matches;
const bgBlur = document.getElementById('bg-blur');

if (isDesktop && bgBlur) {

  const INTENSITY = 30;

  window.addEventListener('mousemove', (e) => {

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const percentX = (e.clientX - centerX) / centerX;
    const percentY = (e.clientY - centerY) / centerY;

    const moveX = -percentX * INTENSITY;
    const moveY = -percentY * INTENSITY;

    bgBlur.style.setProperty('--mouse-x', `${moveX}px`);
    bgBlur.style.setProperty('--mouse-y', `${moveY}px`);
  });
}
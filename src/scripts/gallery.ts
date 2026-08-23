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

// 获取图片编号 DOM
const photoNoEl = document.getElementById('photo-no');

// 点赞相关 DOM 元素
const likeCheckbox = document.getElementById('like-checkbox') as HTMLInputElement;
const likeCountEl = document.getElementById('like-count');

let isReadyToOpen = false; 
let isAnimating = false;  

// ========================================================
// 水光涟漪引擎
// ========================================================
interface WaterRing {
  x: number; y: number; radius: number; maxRadius: number;
  alpha: number; lineWidth: number; speed: number;
}
interface WaterGlow {
  x: number; y: number; radius: number; alpha: number;
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
        x, y,
        radius: isClick ? 10 : 2,
        maxRadius: isClick ? 180 + i * 40 : 50,
        alpha: isClick ? 0.45 : 0.2,
        lineWidth: isClick ? 1.0 : 0.6,
        speed: isClick ? 3.5 + i * 0.8 : 1.2
      });
    }, i * 120);
  }
  if (isClick) glows.push({ x, y, radius: 10, alpha: 0.25 });
}

function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ambientTimer++;
  if (!isOpening && ambientTimer % 180 === 0) {
    createRipple(Math.random() * canvas.width, Math.random() * canvas.height, false);
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
    if (r.alpha <= 0 || r.radius >= r.maxRadius) rings.splice(i, 1);
  }
  animId = requestAnimationFrame(renderFrame);
}
renderFrame();

// ========================================================
// 点击水面开场
// ========================================================
splash?.addEventListener('click', (e: MouseEvent) => {
  if (!isReadyToOpen) {
    createRipple(e.clientX, e.clientY, false);
    return;
  }
  if (isOpening) return;
  isOpening = true;

  const rect = canvas.getBoundingClientRect();
  createRipple(e.clientX - rect.left, e.clientY - rect.top, true);

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
});

// ========================================================
// 画廊 API 与预加载
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
        // 1. 设置 Supabase 中的 ID
        if (photoNoEl) photoNoEl.textContent = `${currentItem.id}.`;
        if (likeCountEl) likeCountEl.textContent = currentItem.count.toString();
        if (likeCheckbox) likeCheckbox.checked = false;

        gsap.to(mainImg, { opacity: 1, duration: 0.4 });
        isReadyToOpen = true;
        if (splashHint) splashHint.innerHTML = "点击静水 · 开启画廊";
        preloadAdjacentImages();
      };

      if (firstImg.complete) onFirstLoad();
      else firstImg.onload = onFirstLoad;
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

  new Image().src = images[nextIndex].img_url;
  new Image().src = images[prevIndex].img_url;
}

// ========================================================
// 桌面端：渐隐平滑切图
// ========================================================
function updateDisplay(index: number) {
  if (images.length === 0 || isAnimating) return;
  isAnimating = true;

  currentIndex = (index + images.length) % images.length;
  const currentItem = images[currentIndex];

  // 2. 更新 ID 编号
  if (photoNoEl) photoNoEl.textContent = `${currentItem.id}.`;
  if (likeCountEl) likeCountEl.textContent = currentItem.count.toString();
  if (likeCheckbox) likeCheckbox.checked = false;

  gsap.to('.image-wrapper', {
    opacity: 0.2,
    scale: 0.98,
    duration: 0.15,
    ease: 'power1.in',
    onComplete: () => {
      mainImg.src = currentItem.img_url;
      gsap.to('.image-wrapper', {
        opacity: 1,
        scale: 1,
        duration: 0.25,
        ease: 'power2.out',
        onComplete: () => {
          isAnimating = false;
          preloadAdjacentImages();
        }
      });
    }
  });
}

// ========================================================
// 移动端：双向圆周弧线摆动切图
// ========================================================
function updateDisplayWithArcAnimation(
  newIndex: number,
  direction: 'next' | 'prev'
) {
  if (images.length === 0 || isAnimating) return;
  isAnimating = true;

  currentIndex = (newIndex + images.length) % images.length;
  const currentItem = images[currentIndex];

  // 3. 更新 ID 编号
  if (photoNoEl) photoNoEl.textContent = `${currentItem.id}.`;
  if (likeCountEl) likeCountEl.textContent = currentItem.count.toString();
  if (likeCheckbox) likeCheckbox.checked = false;

  const origin = "50% 120%"; 
  const exitAngle = direction === 'next' ? -25 : 25; 
  const enterAngle = direction === 'next' ? 25 : -25; 
  const wrapper = document.querySelector('.image-wrapper');
  if (!wrapper) return;

  // 1. 旧图做圆周弧线离场
  gsap.to(wrapper, {
    transformOrigin: origin,
    rotate: exitAngle,
    x: direction === 'next' ? -60 : 60,
    opacity: 0,
    duration: 0.22,
    ease: 'power1.in',
    onComplete: () => {
      // 2. 更换图片
      mainImg.src = currentItem.img_url;

      // 3. 将新图瞬间定位到进场摆动点
      gsap.set(wrapper, {
        transformOrigin: origin,
        rotate: enterAngle,
        x: direction === 'next' ? 60 : -60,
        opacity: 0
      });

      // 4. 新图做圆周弧线摆动进场复位
      gsap.to(wrapper, {
        rotate: 0,
        x: 0,
        opacity: 1,
        duration: 0.32,
        ease: 'back.out(1.1)',
        onComplete: () => {
          isAnimating = false;
          preloadAdjacentImages();
        }
      });
    }
  });
}

// 统一切图路由
function changeSlide(direction: 'next' | 'prev') {
  const isMobile = window.innerWidth <= 768;
  const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

  if (isMobile) {
    updateDisplayWithArcAnimation(targetIndex, direction);
  } else {
    updateDisplay(targetIndex);
  }
}

// ========================================================
// 绑定桌面端控制按钮与键盘监听
// ========================================================
if (prevBtn) {
  prevBtn.addEventListener('click', () => changeSlide('prev'));
}
if (nextBtn) {
  nextBtn.addEventListener('click', () => changeSlide('next'));
}

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (!isOpening) return;
  if (e.key === 'ArrowLeft') changeSlide('prev');
  if (e.key === 'ArrowRight') changeSlide('next');
});

// ========================================================
// 移动端左右手势监听
// ========================================================
let touchStartY = 0;
let touchStartX = 0;

window.addEventListener('touchstart', (e: TouchEvent) => {
  if (!isOpening) return;
  touchStartY = e.changedTouches[0].clientY;
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e: TouchEvent) => {
  if (!isOpening) return;
  const deltaX = touchStartX - e.changedTouches[0].clientX;
  const deltaY = Math.abs(touchStartY - e.changedTouches[0].clientY);

  if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > deltaY) {
    if (deltaX > 0) changeSlide('next');
    else changeSlide('prev');
  }
}, { passive: true });

// ========================================================
// 点赞与菜单逻辑
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

document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.querySelector('.menu-icon');
  const menuBg = document.getElementById('menu-bg');
  if (menuBtn && menuBg) {
    menuBtn.addEventListener('click', () => menuBg.classList.toggle('is-active'));
    menuBg.addEventListener('click', () => menuBg.classList.remove('is-active'));
  }
});

// 启动数据请求
fetchImages();
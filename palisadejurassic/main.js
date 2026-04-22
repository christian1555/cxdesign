// ── OS Detection ──
function detectOS() {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'macos';
  if (/Win/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return 'windows';
}

// ── Iconify icon names ──
const osIconNames = {
  macos: 'mdi:apple',
  windows: 'mdi:microsoft-windows',
  linux: 'mdi:linux',
  android: 'mdi:android',
  ios: 'mdi:apple'
};

const downloadOptions = {
  macos: [
    { label: 'macOS (Apple)', meta: 'ARM64', icon: 'macos' },
    { label: 'macOS (Intel)', meta: 'x64', icon: 'macos' },
    { label: 'Windows (64-bit)', meta: 'x64', icon: 'windows' },
    { label: 'Windows (32-bit)', meta: 'x86', icon: 'windows' },
    { label: 'Linux (.deb)', meta: 'x64', icon: 'linux' },
    { label: 'Linux (.rpm)', meta: 'x64', icon: 'linux' }
  ],
  windows: [
    { label: 'Windows (64-bit)', meta: 'x64', icon: 'windows' },
    { label: 'Windows (32-bit)', meta: 'x86', icon: 'windows' },
    { label: 'macOS (Apple)', meta: 'ARM64', icon: 'macos' },
    { label: 'macOS (Intel)', meta: 'x64', icon: 'macos' },
    { label: 'Linux (.deb)', meta: 'x64', icon: 'linux' },
    { label: 'Linux (.rpm)', meta: 'x64', icon: 'linux' }
  ],
  linux: [
    { label: 'Linux (.deb)', meta: 'x64', icon: 'linux' },
    { label: 'Linux (.rpm)', meta: 'x64', icon: 'linux' },
    { label: 'Linux (.AppImage)', meta: 'x64', icon: 'linux' },
    { label: 'Windows (64-bit)', meta: 'x64', icon: 'windows' },
    { label: 'macOS (Apple)', meta: 'ARM64', icon: 'macos' }
  ],
  android: [
    { label: 'Android (.apk)', meta: 'ARM64', icon: 'android' },
    { label: 'Windows (64-bit)', meta: 'x64', icon: 'windows' },
    { label: 'macOS (Apple)', meta: 'ARM64', icon: 'macos' },
    { label: 'Linux (.deb)', meta: 'x64', icon: 'linux' }
  ],
  ios: [
    { label: 'iOS (App Store)', meta: '', icon: 'ios' },
    { label: 'macOS (Apple)', meta: 'ARM64', icon: 'macos' },
    { label: 'Windows (64-bit)', meta: 'x64', icon: 'windows' }
  ]
};

function setButtonState(group, option) {
  const btn = group.querySelector('.cta-btn');
  const iconSpan = btn.querySelector('.os-icon');
  const metaSpan = btn.querySelector('.btn-meta');
  const iconName = osIconNames[option.icon] || osIconNames.windows;
  iconSpan.innerHTML = `<iconify-icon icon="${iconName}" inline></iconify-icon>`;
  iconSpan.classList.toggle('os-icon--apple', option.icon === 'macos' || option.icon === 'ios');
  metaSpan.textContent = option.meta ? `(${option.meta})` : '';
}

function closeAllMenus() {
  document.querySelectorAll('.download-menu.open').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.cta-dropdown.open').forEach(b => b.classList.remove('open'));
}

function initDownloadButtons() {
  const os = detectOS();
  const options = downloadOptions[os] || downloadOptions.windows;
  const defaultOption = options[0];

  document.querySelectorAll('.download-group').forEach(group => {
    setButtonState(group, defaultOption);

    const menu = group.querySelector('.download-menu');
    menu.innerHTML = options.map((opt, i) => {
      const iconName = osIconNames[opt.icon] || osIconNames.windows;
      return `
        <button class="download-menu-item" data-index="${i}">
          <iconify-icon icon="${iconName}" inline></iconify-icon>
          <span>${opt.label}</span>
          ${opt.meta ? `<span class="item-meta">${opt.meta}</span>` : ''}
        </button>
      `;
    }).join('');

    const dropBtn = group.querySelector('.cta-dropdown');
    dropBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');
      closeAllMenus();
      if (!isOpen) {
        menu.classList.add('open');
        dropBtn.classList.add('open');
      }
    });

    menu.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item = e.target.closest('.download-menu-item');
      if (!item) return;
      const idx = parseInt(item.dataset.index, 10);
      const chosen = options[idx];
      setButtonState(group, chosen);
      closeAllMenus();
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.download-group')) {
      closeAllMenus();
    }
  });
}

initDownloadButtons();

// ── Mobile Detection ──
function isMobile() {
  return window.innerWidth <= 900;
}

// ── Particle System ──
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.size = Math.random() * 1.5 + 0.5;
    this.speedY = -(Math.random() * 0.3 + 0.1);
    this.speedX = (Math.random() - 0.5) * 0.2;
    this.opacity = Math.random() * 0.4 + 0.1;
    this.fadeSpeed = Math.random() * 0.003 + 0.001;
    this.growing = Math.random() > 0.5;

    if (isMobile()) {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;

      const leftHalf = document.querySelector('.half--left');
      let splitY = canvas.height * 0.5;
      if (leftHalf) {
        const rect = leftHalf.getBoundingClientRect();
        splitY = rect.bottom;
      }

      if (this.y < splitY) {
        this.r = 77; this.g = 166; this.b = 255;
      } else {
        this.r = 255; this.g = 201; this.b = 77;
      }

      const dist = Math.abs(this.y - splitY);
      const blendZone = 80;
      if (dist < blendZone) {
        this.opacity *= (dist / blendZone) * 0.6 + 0.4;
      }
    } else {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;

      const halfW = canvas.width / 2;
      if (this.x < halfW) {
        this.r = 77; this.g = 166; this.b = 255;
      } else {
        this.r = 255; this.g = 201; this.b = 77;
      }
      const distFromCenter = Math.abs(this.x - halfW) / halfW;
      if (distFromCenter < 0.3) {
        const blend = 1 - (distFromCenter / 0.3);
        this.opacity *= (1 - blend * 0.6);
      }
    }
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;

    if (this.growing) {
      this.opacity += this.fadeSpeed;
      if (this.opacity >= 0.5) this.growing = false;
    } else {
      this.opacity -= this.fadeSpeed;
      if (this.opacity <= 0) this.reset();
    }

    if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
      this.reset();
      this.y = canvas.height + 10;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${this.opacity})`;
    ctx.fill();
  }
}

const particles = Array.from({ length: 120 }, () => new Particle());

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animate);
}
animate();

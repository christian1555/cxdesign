// oversættelser - dansk er default, engelsk her
const i18n = {
  en: {
    'landing.tag': 'Christian Christensen',
    'landing.line1': 'UI/UX, web and AI',
    'landing.line2': 'Digital solutions built for the future.',
    'landing.desc': 'Multimedia designer specializing in UI/UX and web development. I work across both design and code, with a strong focus on how AI is changing the way we build digital products — and how it can be leveraged to create better solutions, faster.',
    'landing.scroll': 'Scroll down',
    'pill.uiux': 'UI / UX Design',
    'pill.web': 'Web Development',
    'pill.ai': 'AI Agents',
    'pill.arch': 'System Architecture',

    'skills.heading': 'Design that moves.<br>Systems that work.',
    'skills.desc': 'Four areas I work with daily — from classic UI/UX to agent systems that build software together.',
    'skills.uiux': 'Wireframes, prototypes, and interfaces with a sharp eye for detail. Smooth flows and aesthetics that hold together from the first click to the last. Design that looks sharp — and works just as well.',
    'skills.uiux.tag': 'Primary specialization',
    'skills.dev.title': 'Web Development',
    'skills.dev': "I build websites and web apps with modern tech, where you own the domain and code afterwards. I develop solutions that don't just look good, but also perform fast, scale well, and are built with the user experience at the center.",
    'skills.dev.tag': 'Core area',
    'skills.agents.title': 'AI Agent Systems',
    'skills.agents': "Multi-agent systems are one of my focus areas, and something I'm increasingly integrating into my workflows: autonomous agents that collaborate, solve tasks, and actually build software together.",
    'skills.agents.tag': 'Personal passion',
    'skills.arch.title': 'AI System Architecture',
    'skills.arch': 'The bigger picture behind AI systems — how agents talk to each other, share memory, handle errors and scale without the whole thing falling apart.',
    'skills.arch.tag': 'Hobby & exploration',

    'norrild.desc': 'Website for a professional consulting firm. The entire site was designed and built by me — from layout and branding to the final code.',
    'truetab.desc': "Chromium extension I built to make new tabs actually useful. Custom widgets, dark theme, and an interface that isn't annoying to look at 50 times a day.",
    'palisade.desc': 'Web design where the whole process to finished product was done with AI as an integrated part of the workflow. Responsive, fast, and with a modern visual style.',
    'cta.startdemo': 'Start demo',
    'cta.closedemo': 'Close demo',

    'proces.heading': 'From sketch to<br>finished product.',
    'proces.desc': 'Wireframes, mockups, and prototypes — all the way from the first idea to the final design. Below you can see my process and download the original files.',
    'proces.tab.wire': 'Wireframes',
    'proces.tab.mock': 'Mockups',
    'proces.tab.code': 'Code',
    'proces.download': 'Download .psd',
    'proces.code.title': 'Hand-coded',
    'proces.code.desc': 'The entire skeleton of this portfolio is written in pure HTML, CSS and JavaScript — using my own tab system in Sublime Text. No frameworks, no templates. Just clean code and full control over every single pixel.',
    'proces.code.hint': 'Click the files on the left to preview a snippet, or download the full source.',
    'proces.code.download': 'Download',

    'foto.heading': 'Almost 20 years of<br>experience with pixels.',
    'foto.desc': 'Photoshop, Lightroom, textures, retouching, compositing — all of it. Everything from the background texture on this site to professional photo editing.',
    'foto.retouch.title': 'Retouching & Compositing',
    'foto.retouch': 'Portraits, product photos, and creative composites. Photoshop has been my primary tool for almost two decades.',
    'foto.texture.title': 'Textures & Assets',
    'foto.texture': 'Handmade textures, patterns and graphic elements. The background on this site? Drawn by hand and processed in Photoshop.',
    'foto.color.title': 'Color Correction',
    'foto.color': 'Lightroom and Camera Raw for color grading, exposure and toning. Giving every image a consistent, professional look.',

    'wip.pre': 'Personal project:',
    'wip.title': 'A browser built by AI agents',
    'wip.desc': "A live view of my actual 21-agent AI team — they only move when they're genuinely handing each other tasks and actively working on the browser. The system behind it is built on OpenClaw + a custom GEPA architecture with advanced memory, sandboxed security and self-improvement loops. This is NOT a demo — it's my real overview of my agents (chat-censored, of course).",
    'wip.hl.agents': 'AI Agents',
    'wip.hl.chromium': 'Chromium-based',
    'wip.hl.team': '21-agent team',
    'wip.live': 'LIVE',
    'wip.connecting': 'connecting to agent roster…',
    'wip.legend.orch': 'Orchestrators',
    'wip.legend.dev': 'Developers',
    'wip.legend.da': "Devil's Advocates",

    'kontakt.heading': "Let's create<br>something together.",
  }
};

// backup af dansk tekst
const daBackup = {};
let activeLang = 'da';

function switchLang(lang) {
  activeLang = lang;
  document.documentElement.lang = lang;

  document.querySelectorAll('.lang-opt').forEach(btn => {
    btn.classList.toggle('current', btn.dataset.lang === lang);
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (!daBackup[key]) daBackup[key] = el.innerHTML;

    if (lang === 'en' && i18n.en[key]) {
      el.innerHTML = i18n.en[key];
    } else if (lang === 'da' && daBackup[key]) {
      el.innerHTML = daBackup[key];
    }
  });
}


// fade elementer ind når de scroller i viewport
const visObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('on');
      visObs.unobserve(e.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.vis').forEach(el => visObs.observe(el));


// vallende linjer over hele siden
(function() {
  const count = 6;
  const minGap = 13; // minimum % mellemrum så de ikke klumper
  const positions = [];

  let tries = 0;
  while (positions.length < count && tries < 500) {
    const candidate = 3 + Math.random() * 94;
    if (!positions.some(p => Math.abs(p - candidate) < minGap)) {
      positions.push(candidate);
    }
    tries++;
  }

  positions.forEach(left => {
    const el = document.createElement('div');
    el.className = 'vline';
    el.style.left = left.toFixed(1) + '%';
    el.style.animationDelay = (Math.random() * 15).toFixed(1) + 's';
    el.style.animationDuration = (9 + Math.random() * 7).toFixed(1) + 's';
    document.body.appendChild(el);
  });
})();


// sidebar - simple dots
const allSections = document.querySelectorAll('section');
const dotsNav = document.getElementById('pageNav');

allSections.forEach((sec, i) => {
  const d = document.createElement('div');
  d.classList.add('nav-dot');
  if (i === 0) d.classList.add('current');
  d.addEventListener('click', () => sec.scrollIntoView({ behavior: 'smooth' }));
  dotsNav.appendChild(d);
});

const navDots = dotsNav.querySelectorAll('.nav-dot');

const secObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const idx = Array.from(allSections).indexOf(e.target);
      navDots.forEach((d, i) => d.classList.toggle('current', i === idx));
    }
  });
}, { threshold: 0.45 });

allSections.forEach(s => secObs.observe(s));


// parallax på projekt-billeder
const covers = document.querySelectorAll('.cover');
let ticking = false;

if (window.innerWidth > 900) {
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const mid = window.innerHeight / 2;
      covers.forEach(img => {
        if (img.querySelector('.projekt-demo-frame')) return;
        const rect = img.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const off = (rect.top - mid) * 0.08;
        img.style.transform = `scale(1.08) translateY(${off}px)`;
      });
      ticking = false;
    });
  }, { passive: true });
}


// cursor glow - kun desktop
if (!('ontouchstart' in window) && window.innerWidth > 768) {
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  Object.assign(glow.style, {
    position: 'fixed',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: '0',
    transform: 'translate(-50%, -50%)',
    transition: 'opacity 0.3s'
  });
  document.body.appendChild(glow);

  let glowRAF = false;
  document.addEventListener('mousemove', (e) => {
    if (glowRAF) return;
    glowRAF = true;
    requestAnimationFrame(() => {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
      glowRAF = false;
    });
  });
}


// iframes loades med det samme — og vi injicerer overscroll-cap så de ikke bouncer
document.querySelectorAll('.projekt-demo-frame').forEach(iframe => {
  if (iframe.dataset.src) iframe.src = iframe.dataset.src;
  iframe.addEventListener('load', () => {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const style = doc.createElement('style');
      style.textContent = 'html,body{overscroll-behavior:none!important;}';
      doc.head.appendChild(style);
    } catch (e) {}
  });
});

// main knap: idle = start mobil demo, aktiv = luk demo
// gemmer + genopretter scroll for at undgå at iframe autofokuserer og scroller siden
document.querySelectorAll('.demo-main').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const section = btn.closest('.projekt');
    const y = window.scrollY;
    if (section.classList.contains('demo-mobile') || section.classList.contains('demo-full')) {
      closeAllDemos();
    } else {
      openDemo(btn, 'mobile');
      btn.focus({ preventScroll: true });
    }
    const restore = () => {
      if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: 'instant' });
    };
    requestAnimationFrame(restore);
    [40, 120, 240, 400].forEach(ms => setTimeout(restore, ms));
  });
});

// expand: skifter mellem mobil og fuld demo
document.querySelectorAll('.demo-expand').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const section = btn.closest('.projekt');
    if (section.classList.contains('demo-full')) {
      section.classList.remove('demo-full');
      section.classList.add('demo-mobile');
    } else if (section.classList.contains('demo-mobile')) {
      section.classList.remove('demo-mobile');
      section.classList.add('demo-full');
    }
  });
});

// luk alle demos — snapper tilbage til projekt-sektionen
function closeAllDemos() {
  const active = document.querySelector('.projekt.demo-full, .projekt.demo-mobile');
  // iframe kan stadig holde fokus efter scroll-i-demo; tving fokus tilbage til siden
  if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
    document.activeElement.blur();
  }
  document.querySelectorAll('.projekt.demo-full, .projekt.demo-mobile').forEach(p => {
    p.classList.remove('demo-full', 'demo-mobile');
  });
  document.body.classList.remove('demo-open');
  if (active) {
    const top = active.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: 'instant' });
    // flyt fokus helt væk fra demo-området så næste scroll går til siden
    if (typeof window.focus === 'function') window.focus();
  }
}

// åbn demo — mode: 'full' eller 'mobile'
function openDemo(el, mode) {
  const section = el.closest('.projekt');
  const cls = 'demo-' + mode;

  if (section.classList.contains(cls)) { closeAllDemos(); return; }

  closeAllDemos();
  section.classList.add(cls);
  document.body.classList.add('demo-open');

  // scroll iframe til toppen
  const iframe = section.querySelector('.projekt-demo-frame');
  if (iframe && iframe.contentWindow) {
    try { iframe.contentWindow.scrollTo(0, 0); } catch(e) {}
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllDemos();
});


// kode file browser
document.querySelectorAll('.code-fileitem').forEach(item => {
  item.addEventListener('click', () => {
    const file = item.dataset.file;
    const path = item.dataset.path;

    document.querySelectorAll('.code-fileitem').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    document.querySelectorAll('.code-snippet').forEach(s => s.classList.remove('active'));
    const snippet = document.querySelector('.code-snippet[data-snippet="' + file + '"]');
    if (snippet) snippet.classList.add('active');

    const filename = document.getElementById('codeFilename');
    if (filename) filename.textContent = path.split('/').pop();

    const dl = document.getElementById('codeDownload');
    if (dl) dl.setAttribute('href', path);
  });
});

// proces tabs
document.querySelectorAll('.proces-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    document.querySelectorAll('.proces-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.proces-panel').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById('panel-' + target).classList.add('active');

    // re-trigger vis animations for newly shown panel
    document.getElementById('panel-' + target).querySelectorAll('.vis:not(.on)').forEach(el => {
      visObs.observe(el);
    });
  });
});

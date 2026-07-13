/**
 * 个人简历网站 - 主页面 JavaScript
 * ============================================
 * 功能: 主题切换、导航高亮、滚动动画、技能条动画等
 * ============================================
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ---- 访问控制 ----
  AccessControl.enforce().then(result => {
    if (result.allowed) {
      initPage();
    }
  });

  function initPage() {
    initTheme();
    initNavigation();
    initScrollAnimations();
    initSkillBars();
    initContactForm();
    initTypewriter();
    initSmoothScroll();
    initHiddenAdminAccess();
  }

  // ==========================================
  // 主题切换
  // ==========================================
  function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    // 检测系统偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const saved = localStorage.getItem('resume_theme');

    let theme;
    if (saved) {
      theme = saved;
    } else {
      theme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(toggle, theme);

    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('resume_theme', next);
      updateThemeIcon(toggle, next);
    });
  }

  function updateThemeIcon(btn, theme) {
    if (!btn) return;
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
  }

  // ==========================================
  // 导航
  // ==========================================
  function initNavigation() {
    const header = document.querySelector('.header');
    const hamburger = document.querySelector('.hamburger');
    const navList = document.querySelector('.nav-list');

    // 滚动阴影
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      header.classList.toggle('scrolled', scrollY > 50);
      lastScroll = scrollY;
    }, { passive: true });

    // 移动端菜单
    if (hamburger && navList) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navList.classList.toggle('open');
      });

      // 点击链接后关闭菜单
      navList.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('active');
          navList.classList.remove('open');
        });
      });
    }

    // 滚动高亮当前 section
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-list a');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + entry.target.id) {
              link.classList.add('active');
            }
          });
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px' });

    sections.forEach(section => observer.observe(section));
  }

  // ==========================================
  // 滚动动画 (Intersection Observer)
  // ==========================================
  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale');

    if (animatedElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');

          // 如果是技能条，触发动画
          if (entry.target.querySelector('.skill-bar-fill')) {
            entry.target.querySelectorAll('.skill-bar-fill').forEach(bar => {
              bar.classList.add('animated');
            });
          }
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => observer.observe(el));
  }

  // ==========================================
  // 技能条动画
  // ==========================================
  function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-bar-fill');
    skillBars.forEach(bar => {
      const width = bar.getAttribute('data-width') || bar.style.getPropertyValue('--skill-width') || '0%';
      bar.style.setProperty('--skill-width', width);

      // 如果父元素已可见则立即动画
      const parent = bar.closest('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale');
      if (parent && parent.classList.contains('visible')) {
        setTimeout(() => bar.classList.add('animated'), 200);
      }
    });
  }

  // ==========================================
  // 打字机效果 (Hero 标题)
  // ==========================================
  function initTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;

    const phrases = JSON.parse(el.getAttribute('data-phrases') || '[]');
    if (phrases.length === 0) return;

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isPaused = false;

    function type() {
      const currentPhrase = phrases[phraseIndex];

      if (isPaused) {
        setTimeout(type, 2000);
        isPaused = false;
        return;
      }

      if (isDeleting) {
        el.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
      } else {
        el.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
      }

      let delay = isDeleting ? 40 : 80;

      if (!isDeleting && charIndex === currentPhrase.length) {
        delay = 3000;
        isPaused = true;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        delay = 500;
      }

      setTimeout(type, delay);
    }

    type();
  }

  // ==========================================
  // 平滑滚动 (导航锚点)
  // ==========================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // ==========================================
  // 隐蔽管理入口 (多通道)
  // ==========================================
  function initHiddenAdminAccess() {
    const logo = document.querySelector('.logo');
    if (!logo) return;

    // ---- 通道 1: Logo 连点 5 次 ----
    let clickCount = 0;
    let clickTimer = null;
    const REQUIRED_CLICKS = 5;
    const RESET_MS = 2000;

    logo.addEventListener('click', (e) => {
      e.preventDefault();
      clickCount++;

      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, RESET_MS);
      }

      if (clickCount >= REQUIRED_CLICKS) {
        clearTimeout(clickTimer);
        clickCount = 0;
        openAdmin();
      }
    });

    // ---- 通道 2: URL 参数 ?admin ----
    if (window.location.search.includes('admin')) {
      openAdmin();
    }

    // ---- 通道 3: 键盘 Ctrl+Shift+A ----
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        openAdmin();
      }
    });
  }

  function openAdmin() {
    // 优先尝试弹窗
    const win = window.open('admin.html', '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      // 弹窗被拦截 → 在当前页跳转，并携带 ?from=resume 参数方便返回
      const hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;background:var(--color-bg-card, #1e293b);color:var(--color-text, #fff);padding:14px 24px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.3);font-size:0.9rem;font-weight:500;border:1px solid var(--color-border, #334155);transition:opacity 0.3s';
      hint.textContent = '⏳ 正在跳转管理后台...';
      document.body.appendChild(hint);
      setTimeout(() => {
        window.location.href = 'admin.html?from=resume';
      }, 600);
    }
  }

  // ==========================================
  // 联系表单
  // ==========================================
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const btn = form.querySelector('.submit-btn');
      const originalText = btn.textContent;
      btn.textContent = '⏳ 发送中...';
      btn.disabled = true;

      // 模拟发送 (实际可替换为邮件服务)
      setTimeout(() => {
        btn.textContent = '✅ 已发送！';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.disabled = false;
          form.reset();
        }, 2000);
      }, 1500);
    });
  }
});

/* ============================================================
   HRMS — Client-side interactions
   Animated counters, ripples, tilt, scroll reveals, toasts
   ============================================================ */

(function () {
  'use strict';

  // ─── Animated Counter ─────────────────────────────────────────────
  // Auto-runs on any element with data-counter attribute
  // The element's text content is treated as the target number
  function animateCounter(el) {
    const target = parseFloat(el.dataset.counter || el.textContent.replace(/[^\d.-]/g, '')) || 0;
    if (isNaN(target) || target === 0) return;

    const duration = parseInt(el.dataset.duration) || 1200;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimals) || 0;
    const formatComma = el.dataset.comma !== 'false';

    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      const current = target * eased;

      let formatted = current.toFixed(decimals);
      if (formatComma) {
        const parts = formatted.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = parts.join('.');
      }
      el.textContent = prefix + formatted + suffix;

      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    document.querySelectorAll('[data-counter]').forEach((el) => {
      // Use IntersectionObserver so counters only animate when scrolled into view
      if (el.dataset.animated === 'true') return;
      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && el.dataset.animated !== 'true') {
              el.dataset.animated = 'true';
              animateCounter(el);
              obs.disconnect();
            }
          });
        }, { threshold: 0.1 });
        obs.observe(el);
      } else {
        el.dataset.animated = 'true';
        animateCounter(el);
      }
    });
  }

  // ─── Tilt effect on stat cards ─────────────────────────────────────
  function initTilt() {
    document.querySelectorAll('.stat').forEach((card) => {
      let rect = null;

      card.addEventListener('mouseenter', () => { rect = card.getBoundingClientRect(); });
      card.addEventListener('mousemove', (e) => {
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -3;
        const rotateY = ((x - centerX) / centerX) * 3;
        card.style.transform = `translateY(-3px) perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        rect = null;
      });
    });
  }

  // ─── Ripple click effect ──────────────────────────────────────────
  function initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-base, .btn, .btn-primary, .btn-outline, .btn-ghost, .btn-success, .btn-error');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.cssText = `
        position: absolute; border-radius: 50%; pointer-events: none;
        width: ${size}px; height: ${size}px;
        left: ${e.clientX - rect.left - size / 2}px;
        top: ${e.clientY - rect.top - size / 2}px;
        background: rgba(255, 255, 255, 0.4);
        transform: scale(0);
        animation: ripple-anim 600ms ease-out;
      `;
      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  // ─── Toast notifications ───────────────────────────────────────────
  window.toast = function (message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        z-index: 9999; display: flex; flex-direction: column; gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    const colors = {
      success: { bg: '#10B981', icon: '✓' },
      error:   { bg: '#EF4444', icon: '✕' },
      warning: { bg: '#F59E0B', icon: '!' },
      info:    { bg: '#6366F1', icon: 'i' },
    };
    const cfg = colors[type] || colors.info;

    const t = document.createElement('div');
    t.style.cssText = `
      background: white; padding: 14px 18px; border-radius: 12px;
      box-shadow: 0 20px 40px -10px rgba(15,23,42,0.2);
      display: flex; align-items: center; gap: 12px;
      min-width: 280px; max-width: 420px;
      border-left: 4px solid ${cfg.bg};
      font-size: 14px; color: #1E293B; font-weight: 500;
      pointer-events: auto;
      transform: translateX(120%);
      transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    t.innerHTML = `
      <span style="width:28px; height:28px; border-radius:50%; background:${cfg.bg}; color:white; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">${cfg.icon}</span>
      <span style="flex:1;">${message}</span>
    `;
    container.appendChild(t);
    requestAnimationFrame(() => { t.style.transform = 'translateX(0)'; });
    setTimeout(() => {
      t.style.transform = 'translateX(120%)';
      setTimeout(() => t.remove(), 400);
    }, duration);
  };

  // ─── Smooth in-page links ──────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // ─── Init on DOM ready ─────────────────────────────────────────────
  function init() {
    initCounters();
    initTilt();
    initRipple();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-run counters after HTMX swaps
  document.body.addEventListener('htmx:afterSwap', initCounters);

  // Inject ripple keyframe once
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple-anim {
      to { transform: scale(1); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
})();

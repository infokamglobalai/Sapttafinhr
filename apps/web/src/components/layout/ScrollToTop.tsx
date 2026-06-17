import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollWindowToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, '');
  if (!id) {
    scrollWindowToTop();
    return;
  }

  // Wait one frame so the destination page has mounted its DOM.
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      return;
    }
    scrollWindowToTop();
  });
}

/** Keep the viewport at the top on navigation and full page refresh. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      scrollToHash(hash);
      return;
    }
    scrollWindowToTop();
  }, [pathname, hash]);

  return null;
}

import { useEffect, useState } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const queries: { bp: Breakpoint; min: number }[] = [
  { bp: 'xl', min: 1400 },
  { bp: 'lg', min: 992 },
  { bp: 'md', min: 768 },
  { bp: 'sm', min: 576 },
  { bp: 'xs', min: 0 },
];

function getBreakpoint(width: number): Breakpoint {
  for (const { bp, min } of queries) {
    if (width >= min) return bp;
  }
  return 'xs';
}

export default function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const breakpoint = getBreakpoint(width);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    width,
    breakpoint,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 992,
    isDesktop: width >= 992,
    isWide: width >= 1400,
  };
}

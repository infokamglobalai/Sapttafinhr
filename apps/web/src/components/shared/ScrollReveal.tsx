import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: 'fade-in-up' | 'fade-in-down' | 'fade-in-left' | 'fade-in-right' | 'scale-in';
  delay?: number; // In milliseconds
  threshold?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function ScrollReveal({
  children,
  animation = 'fade-in-up',
  delay = 0,
  threshold = 0.1,
  className = '',
  style = {},
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Apply a delayed state to activate classes
          const timer = setTimeout(() => {
            setVisible(true);
          }, delay);
          
          observer.disconnect();
          return () => clearTimeout(timer);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  const getAnimationClass = () => {
    switch (animation) {
      case 'fade-in-up':
        return 'reveal';
      case 'fade-in-down':
        return 'reveal-down';
      case 'fade-in-left':
        return 'reveal-left';
      case 'fade-in-right':
        return 'reveal-right';
      case 'scale-in':
        return 'reveal-scale';
      default:
        return 'reveal';
    }
  };

  return (
    <div
      ref={ref}
      className={`${getAnimationClass()} ${visible ? 'visible' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

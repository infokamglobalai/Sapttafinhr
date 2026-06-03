import type { ReactNode } from 'react';

export type TrustedLogo = {
  id: string;
  name: string;
  color: string;
  wordmark: ReactNode;
};

export function LogoWordmark({ children, className = 'home-trusted-by__svg' }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {children}
    </svg>
  );
}

export const TRUSTED_LOGOS: TrustedLogo[] = [
  {
    id: 'razorpay',
    name: 'Razorpay',
    color: '#072654',
    wordmark: (
      <LogoWordmark>
        <text x="0" y="23" fontSize="20" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.02em">
          razorpay
        </text>
      </LogoWordmark>
    ),
  },
  {
    id: 'freshworks',
    name: 'Freshworks',
    color: '#1D8A5C',
    wordmark: (
      <LogoWordmark>
        <text x="0" y="23" fontSize="19" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.03em">
          freshworks
        </text>
      </LogoWordmark>
    ),
  },
  {
    id: 'zoho',
    name: 'Zoho',
    color: '#E42527',
    wordmark: (
      <LogoWordmark>
        <text x="0" y="24" fontSize="24" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.06em">
          ZOHO
        </text>
      </LogoWordmark>
    ),
  },
  {
    id: 'meesho',
    name: 'Meesho',
    color: '#9F2089',
    wordmark: (
      <LogoWordmark>
        <text x="0" y="23" fontSize="22" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.02em">
          meesho
        </text>
      </LogoWordmark>
    ),
  },
  {
    id: 'nykaa',
    name: 'Nykaa',
    color: '#FC2779',
    wordmark: (
      <LogoWordmark>
        <text x="0" y="24" fontSize="23" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.04em">
          NYKAA
        </text>
      </LogoWordmark>
    ),
  },
  {
    id: 'paytm',
    name: 'Paytm',
    color: '#00BAF2',
    wordmark: (
      <LogoWordmark>
        <text x="0" y="23" fontSize="21" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
          Paytm
        </text>
      </LogoWordmark>
    ),
  },
  {
    id: 'swiggy',
    name: 'Swiggy',
    color: '#FC8019',
    wordmark: (
      <LogoWordmark>
        <text x="0" y="23" fontSize="21" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.01em">
          SWIGGY
        </text>
      </LogoWordmark>
    ),
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    color: '#5F259F',
    wordmark: (
      <LogoWordmark>
        <text x="0" y="23" fontSize="20" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
          PhonePe
        </text>
      </LogoWordmark>
    ),
  },
];

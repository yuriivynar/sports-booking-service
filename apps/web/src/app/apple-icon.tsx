import { ImageResponse } from 'next/og';
import { LOGO_PATH } from '@/components/brand/logo';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Home-screen icon for iOS, generated from the same mark as the favicon. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F97316',
      }}
    >
      <svg width="140" height="140" viewBox="0 0 32 32">
        <path
          d={LOGO_PATH}
          transform="skewX(-12) translate(3.2 0)"
          fill="none"
          stroke="#0C0A09"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    size,
  );
}

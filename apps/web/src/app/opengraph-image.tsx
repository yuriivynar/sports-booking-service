import { ImageResponse } from 'next/og';
import { LOGO_PATH } from '@/components/brand/logo';

export const alt = 'SportHub — sports halls, sections and trainers in Lviv';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Preview image shown when a SportHub link is shared in messengers and social networks. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: '#0C0A09',
        color: '#FAFAF9',
        backgroundImage:
          'radial-gradient(circle at 85% 20%, rgba(249,115,22,0.55), transparent 45%), radial-gradient(circle at 10% 90%, rgba(14,165,233,0.35), transparent 40%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <svg width="120" height="120" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="9" fill="#F97316" />
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
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, letterSpacing: -3 }}>
          Sport<span style={{ color: '#F97316' }}>Hub</span>
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: 44, color: '#D6D3D1', maxWidth: 900 }}>
        Halls, group sessions and personal trainers in Lviv. Book in a few taps.
      </div>
    </div>,
    size,
  );
}

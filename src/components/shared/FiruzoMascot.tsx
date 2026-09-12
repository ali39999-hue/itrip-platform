'use client';

import { cn } from '@/lib/utils';

/**
 * Firuzo mascot (شخصیت فیروزو) — flat-vector leaf character rendered as SVG.
 *
 * Built from the Firuzo brand spec: teal body #00B39F, dark teal #00695C,
 * pink cheeks #FF8FB1, saffron flag #FFC947. The face is parameterized by an
 * `emotion` so the AI assistant can mirror the conversation mood.
 */

export type FiruzoEmotion =
  | 'happy'
  | 'excited'
  | 'calm'
  | 'curious'
  | 'surprised'
  | 'confused'
  | 'sad'
  | 'tired'
  | 'sleepy'
  | 'worried'
  | 'angry'
  | 'successful';

const C = {
  body: '#00B39F',
  bodyShade: '#00A08E',
  dark: '#00695C',
  deepest: '#05443E',
  cheek: '#FF8FB1',
  flag: '#FFC947',
  white: '#FFFFFF',
  sparkle: '#FFC947',
} as const;

interface Face {
  eyes: 'open' | 'wide' | 'half' | 'closed' | 'down' | 'squint' | 'sparkle';
  mouth: 'smile' | 'bigSmile' | 'smallSmile' | 'o' | 'wavy' | 'frown';
  brows?: 'sad' | 'angry';
  flag?: boolean;
  flagRaised?: boolean;
  extra?: 'question' | 'sweat' | 'zzz' | 'sparkles' | 'anger' | 'exclaim';
}

const FACES: Record<FiruzoEmotion, Face> = {
  happy: { eyes: 'open', mouth: 'smile', flag: true },
  excited: { eyes: 'sparkle', mouth: 'bigSmile', flag: true, flagRaised: true, extra: 'sparkles' },
  calm: { eyes: 'half', mouth: 'smallSmile' },
  curious: { eyes: 'open', mouth: 'o', extra: 'question' },
  surprised: { eyes: 'wide', mouth: 'o', extra: 'exclaim' },
  confused: { eyes: 'squint', mouth: 'wavy', extra: 'question' },
  sad: { eyes: 'down', brows: 'sad', mouth: 'frown' },
  tired: { eyes: 'half', mouth: 'wavy', extra: 'sweat' },
  sleepy: { eyes: 'closed', mouth: 'smallSmile', extra: 'zzz' },
  worried: { eyes: 'down', brows: 'sad', mouth: 'wavy', extra: 'sweat' },
  angry: { eyes: 'squint', brows: 'angry', mouth: 'frown', extra: 'anger' },
  successful: { eyes: 'sparkle', mouth: 'bigSmile', flag: true, flagRaised: true, extra: 'sparkles' },
};

export function FiruzoMascot({
  emotion = 'happy',
  size = 64,
  className,
  animated = true,
}: {
  emotion?: FiruzoEmotion;
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const face = FACES[emotion] ?? FACES.happy;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-hidden="true"
      className={cn('shrink-0', animated && 'fz-float', className)}
    >
      {/* shadow */}
      <ellipse cx="60" cy="108" rx="26" ry="5" fill="#00695C" opacity="0.14" />

      {/* feet */}
      <ellipse cx="48" cy="101" rx="9" ry="6" fill={C.dark} />
      <ellipse cx="72" cy="101" rx="9" ry="6" fill={C.dark} />

      {/* left arm (viewer) */}
      <path d="M28 62 q-10 6 -8 16 q8 2 14 -6 Z" fill={C.bodyShade} />

      {/* right arm holds flag */}
      <path d="M92 62 q10 6 8 16 q-8 2 -14 -6 Z" fill={C.bodyShade} />

      {/* flag */}
      {face.flag && (
        <g transform={face.flagRaised ? 'translate(0,-6)' : undefined}>
          <line x1="99" y1="66" x2="106" y2="38" stroke={C.deepest} strokeWidth="3" strokeLinecap="round" />
          <path d="M106 38 L120 44 L106 52 Z" fill={C.flag} />
        </g>
      )}

      {/* leaf body — gumdrop with a center crease */}
      <path
        d="M60 12 C82 14 96 32 96 58 C96 84 82 100 60 100 C38 100 24 84 24 58 C24 32 38 14 60 12 Z"
        fill={C.body}
      />
      <path
        d="M60 12 C60 30 59 60 60 100"
        stroke={C.dark}
        strokeOpacity="0.35"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* subtle top highlight */}
      <path d="M44 26 q10 -9 26 -7" stroke={C.white} strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />

      {/* brows */}
      {face.brows === 'sad' && (
        <>
          <path d="M38 44 q7 -6 14 -2" stroke={C.deepest} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M82 44 q-7 -6 -14 -2" stroke={C.deepest} strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      {face.brows === 'angry' && (
        <>
          <path d="M38 40 l15 6" stroke={C.deepest} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M82 40 l-15 6" stroke={C.deepest} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}

      {/* eyes */}
      {face.eyes === 'open' && (
        <>
          <g>
            <circle cx="45" cy="54" r="9.5" fill={C.white} stroke={C.deepest} strokeWidth="1.6" />
            <circle cx="47" cy="56" r="4.6" fill={C.deepest} />
            <circle cx="44.4" cy="52.6" r="1.6" fill={C.white} />
          </g>
          <g>
            <circle cx="75" cy="54" r="9.5" fill={C.white} stroke={C.deepest} strokeWidth="1.6" />
            <circle cx="77" cy="56" r="4.6" fill={C.deepest} />
            <circle cx="74.4" cy="52.6" r="1.6" fill={C.white} />
          </g>
        </>
      )}
      {face.eyes === 'wide' && (
        <>
          <circle cx="45" cy="54" r="11.5" fill={C.white} stroke={C.deepest} strokeWidth="1.8" />
          <circle cx="45" cy="56" r="5" fill={C.deepest} />
          <circle cx="42.6" cy="51.6" r="1.7" fill={C.white} />
          <circle cx="75" cy="54" r="11.5" fill={C.white} stroke={C.deepest} strokeWidth="1.8" />
          <circle cx="75" cy="56" r="5" fill={C.deepest} />
          <circle cx="72.6" cy="51.6" r="1.7" fill={C.white} />
        </>
      )}
      {face.eyes === 'half' && (
        <>
          <path d="M36 54 q9 6 18 0" stroke={C.deepest} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M66 54 q9 6 18 0" stroke={C.deepest} strokeWidth="3.4" strokeLinecap="round" fill="none" />
        </>
      )}
      {face.eyes === 'closed' && (
        <>
          <path d="M36 55 q9 5 18 0" stroke={C.deepest} strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M66 55 q9 5 18 0" stroke={C.deepest} strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </>
      )}
      {face.eyes === 'down' && (
        <>
          <path d="M37 52 q8 7 16 3" stroke={C.deepest} strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M67 55 q8 4 16 -3" stroke={C.deepest} strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </>
      )}
      {face.eyes === 'squint' && (
        <>
          <path d="M37 52 l16 4" stroke={C.deepest} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M83 52 l-16 4" stroke={C.deepest} strokeWidth="3.2" strokeLinecap="round" />
        </>
      )}
      {face.eyes === 'sparkle' && (
        <>
          <path d="M45 46 l2.4 5.6 L53 54 l-5.6 2.4 L45 62 l-2.4 -5.6 L37 54 l5.6 -2.4 Z" fill={C.deepest} />
          <path d="M75 46 l2.4 5.6 L83 54 l-5.6 2.4 L75 62 l-2.4 -5.6 L67 54 l5.6 -2.4 Z" fill={C.deepest} />
        </>
      )}

      {/* cheeks */}
      <ellipse cx="35" cy="66" rx="6" ry="4" fill={C.cheek} opacity="0.85" />
      <ellipse cx="85" cy="66" rx="6" ry="4" fill={C.cheek} opacity="0.85" />

      {/* mouth */}
      {face.mouth === 'smile' && (
        <path d="M50 72 q10 9 20 0" stroke={C.deepest} strokeWidth="3.4" strokeLinecap="round" fill="none" />
      )}
      {face.mouth === 'bigSmile' && (
        <>
          <path d="M46 70 q14 16 28 0 q-14 7 -28 0 Z" fill={C.deepest} />
          <path d="M52 79 q8 4 16 0" stroke={C.cheek} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      )}
      {face.mouth === 'smallSmile' && (
        <path d="M53 73 q7 5 14 0" stroke={C.deepest} strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {face.mouth === 'o' && (
        <>
          <ellipse cx="60" cy="75" rx="5.5" ry="7" fill={C.deepest} />
          <ellipse cx="60" cy="77.5" rx="3" ry="3.4" fill={C.cheek} opacity="0.7" />
        </>
      )}
      {face.mouth === 'wavy' && (
        <path d="M48 74 q4 -4 7 0 q3 4 7 0 q3 -3 6 0" stroke={C.deepest} strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {face.mouth === 'frown' && (
        <path d="M50 78 q10 -9 20 0" stroke={C.deepest} strokeWidth="3.4" strokeLinecap="round" fill="none" />
      )}

      {/* extras */}
      {face.extra === 'question' && (
        <text x="14" y="30" fontSize="26" fontWeight="900" fill={C.dark} fontFamily="inherit" className={animated ? 'fz-bob' : undefined}>
          ؟
        </text>
      )}
      {face.extra === 'exclaim' && (
        <text x="14" y="32" fontSize="28" fontWeight="900" fill={C.flag} className={animated ? 'fz-bob' : undefined}>
          !
        </text>
      )}
      {face.extra === 'sweat' && (
        <path d="M92 40 q5 7 0 11 q-5 -4 0 -11 Z" fill="#7FD6D2" className={animated ? 'fz-bob' : undefined} />
      )}
      {face.extra === 'zzz' && (
        <g fill={C.dark} className={animated ? 'fz-bob' : undefined}>
          <text x="88" y="30" fontSize="15" fontWeight="900">z</text>
          <text x="98" y="20" fontSize="11" fontWeight="900">z</text>
        </g>
      )}
      {face.extra === 'anger' && (
        <g stroke="#E25555" strokeWidth="2.6" strokeLinecap="round" className={animated ? 'fz-bob' : undefined}>
          <path d="M14 20 l6 6" />
          <path d="M20 20 l-6 6" />
          <path d="M104 16 l6 6" />
          <path d="M110 16 l-6 6" />
        </g>
      )}
      {face.extra === 'sparkles' && (
        <g fill={C.sparkle} className={animated ? 'fz-twinkle' : undefined}>
          <path d="M18 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
          <path d="M104 60 l1.5 3.8 3.8 1.5 -3.8 1.5 -1.5 3.8 -1.5 -3.8 -3.8 -1.5 3.8 -1.5 Z" />
        </g>
      )}

      <defs>
        <style>{`
          .fz-float { animation: fz-float 3.2s ease-in-out infinite; transform-origin: center; }
          .fz-bob { animation: fz-bob 1.6s ease-in-out infinite; }
          .fz-twinkle { animation: fz-twinkle 1.8s ease-in-out infinite; transform-origin: 60px 60px; }
          @keyframes fz-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
          @keyframes fz-bob { 0%,100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(-2px); opacity: .75; } }
          @keyframes fz-twinkle { 0%,100% { opacity: .35; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.05); } }
          @media (prefers-reduced-motion: reduce) { .fz-float, .fz-bob, .fz-twinkle { animation: none; } }
        `}</style>
      </defs>
    </svg>
  );
}

/** Compact head-only variant for avatars / FAB buttons. */
export function FiruzoMascotHead({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true" className={cn('shrink-0', className)}>
      <path
        d="M60 10 C84 12 98 32 98 60 C98 88 82 104 60 104 C38 104 22 88 22 60 C22 32 36 12 60 10 Z"
        fill={C.body}
      />
      <path d="M60 10 C60 34 59 66 60 104" stroke={C.dark} strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      <circle cx="45" cy="56" r="10.5" fill={C.white} stroke={C.deepest} strokeWidth="1.8" />
      <circle cx="47.5" cy="58" r="5" fill={C.deepest} />
      <circle cx="44.6" cy="54" r="1.8" fill={C.white} />
      <circle cx="76" cy="56" r="10.5" fill={C.white} stroke={C.deepest} strokeWidth="1.8" />
      <circle cx="78.5" cy="58" r="5" fill={C.deepest} />
      <circle cx="75.6" cy="54" r="1.8" fill={C.white} />
      <ellipse cx="33" cy="70" rx="6.5" ry="4.5" fill={C.cheek} opacity="0.85" />
      <ellipse cx="87" cy="70" rx="6.5" ry="4.5" fill={C.cheek} opacity="0.85" />
      <path d="M49 76 q11 10 22 0" stroke={C.deepest} strokeWidth="3.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

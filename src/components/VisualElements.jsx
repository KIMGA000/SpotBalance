import React, { useMemo } from "react";

export const MountainSilhouette = () => (
  <div
    aria-hidden="true"
    className="absolute left-[-10vw] -top-[140px] w-[120vw] h-[160px] z-10 pointer-events-none opacity-30">
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1000 60"
      preserveAspectRatio="none">
      <path
        d="M 0 60 L 0 35 L 80 25 L 180 45 L 280 15 L 380 35 L 500 10 L 620 30 L 750 15 L 880 35 L 1000 20 L 1000 60 Z"
        fill="#6B5FD8"
        opacity="0.2"
      />
      <path
        d="M 0 60 L 0 45 L 120 38 L 250 48 L 400 32 L 550 45 L 700 35 L 850 42 L 1000 38 L 1000 60 Z"
        fill="#5A4EBF"
        opacity="0.3"
      />
    </svg>
  </div>
);

export const SailboatSilhouette = () => (
  <div
    aria-hidden="true"
    className="absolute right-[10%] -top-[80px] z-10 pointer-events-none opacity-40 char-float">
    <svg width="55" height="48" viewBox="0 0 36 30">
      <line
        x1="18"
        y1="22"
        x2="18"
        y2="4"
        stroke="#2D2A4A"
        strokeWidth="1.2"
        opacity="0.8"
      />
      <path d="M 18 5 L 18 22 L 30 22 Z" fill="#6B5FD8" opacity="0.55" />
      <path d="M 18 5 L 18 22 L 8 22 Z" fill="#6B5FD8" opacity="0.65" />
      <path d="M 4 22 L 32 22 L 28 27 L 8 27 Z" fill="#2D2A4A" opacity="0.75" />
    </svg>
  </div>
);

export const NatureSilhouette = () => (
  <div
    aria-hidden="true"
    className="absolute -top-[150px] left-[4%] z-30 opacity-90 sway">
    <svg
      width="110"
      height="210"
      viewBox="-10 -10 104 190"
      xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="42" cy="165" rx="26" ry="4" fill="rgba(40,60,80,0.18)" />
      <path
        d="M 46 167 Q 48 138 40 116 Q 32 92 38 66 Q 42 44 32 22 Q 28 12 30 4"
        stroke="#3D4F62"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 38 108 Q 25 106 12 104"
        stroke="#3D4F62"
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="13" cy="100" rx="15" ry="7" fill="#3D4F62" opacity="0.95" />
      <ellipse cx="68" cy="66" rx="16" ry="8" fill="#3D4F62" opacity="0.95" />
      <ellipse cx="36" cy="76" rx="21" ry="9.5" fill="#3D4F62" opacity="0.98" />
      <ellipse cx="13" cy="44" rx="13" ry="6" fill="#3D4F62" opacity="0.92" />
      <ellipse cx="34" cy="48" rx="19" ry="8.5" fill="#3D4F62" opacity="0.98" />
      <ellipse cx="32" cy="24" rx="15" ry="7.5" fill="#3D4F62" opacity="0.95" />
      <ellipse cx="30" cy="8" rx="11" ry="5" fill="#3D4F62" opacity="0.88" />
    </svg>
  </div>
);

export const TwinklingStars = () => {
  const stars = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 3.5 + 1}px`,
        duration: `${Math.random() * 3 + 2}s`,
        delay: `${Math.random() * 5}s`,
      })),
    [],
  );

  return (
    <>
      {stars.map((star) => (
        <div
          key={star.id}
          className="manual-star"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            "--star-duration": star.duration,
            animationDelay: star.delay,
          }}
        />
      ))}
    </>
  );
};

'use client';

import React, { useMemo } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  color: string;
}

// Deterministic pseudo-random generator to ensure exact matching between SSR and Client
function generateDeterministicStars(count = 60): Star[] {
  const stars: Star[] = [];
  const colors = ['#ffffff', '#bae6fd', '#e0e7ff', '#fef08a', '#c084fc'];

  for (let i = 0; i < count; i++) {
    // Linear congruential generator parameters
    const seed = (i * 9301 + 49297) % 233280;
    const rnd1 = seed / 233280;
    const rnd2 = ((seed * 9301 + 49297) % 233280) / 233280;
    const rnd3 = ((seed * 1337 + 7919) % 233280) / 233280;

    const x = Math.round(rnd1 * 990) / 10; // 0% - 99%
    const y = Math.round(rnd2 * 990) / 10; // 0% - 99%
    const size = rnd3 > 0.8 ? 2 : rnd3 > 0.4 ? 1.5 : 1;
    const opacity = 0.25 + (rnd1 * 0.55);
    const duration = 2.5 + (rnd2 * 3.5);
    const delay = Math.round((rnd3 * 5) * 10) / 10;
    const color = colors[i % colors.length];

    stars.push({ id: i, x, y, size, opacity, duration, delay, color });
  }
  return stars;
}

export function CosmicBackground() {
  const stars = useMemo(() => generateDeterministicStars(60), []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[#030712]"
    >
      {/* Ambient Deep Space Nebulae */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-900/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full bg-purple-900/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-[28rem] h-[28rem] rounded-full bg-indigo-950/15 blur-3xl pointer-events-none" />

      {/* 60 Twinkling Star Nodes */}
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: star.color,
            boxShadow: star.size > 1.5 ? `0 0 ${star.size * 2}px ${star.color}` : 'none',
            opacity: star.opacity,
            animation: `cosmicStarTwinkle ${star.duration}s infinite ease-in-out ${star.delay}s`,
          }}
        />
      ))}

      {/* Subtle Flying Meteors (1-2 shooting stars at randomized 13-17s intervals) */}
      <div className="meteor meteor-1" />
      <div className="meteor meteor-2" />

      <style jsx>{`
        @keyframes cosmicStarTwinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.85);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.15);
          }
        }

        .meteor {
          position: absolute;
          width: 140px;
          height: 1.5px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.4), rgba(56, 189, 248, 0.2), transparent);
          border-radius: 9999px;
          filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.3));
          opacity: 0;
          pointer-events: none;
        }

        .meteor-1 {
          top: 15%;
          right: 10%;
          animation: flyingMeteor1 14s ease-in infinite;
          animation-delay: 2s;
        }

        .meteor-2 {
          top: 35%;
          right: 35%;
          animation: flyingMeteor2 18s ease-in infinite;
          animation-delay: 9s;
        }

        @keyframes flyingMeteor1 {
          0% {
            transform: rotate(-35deg) translateX(0);
            opacity: 0;
          }
          2% {
            opacity: 0.35;
          }
          6% {
            transform: rotate(-35deg) translateX(-480px);
            opacity: 0;
          }
          100% {
            transform: rotate(-35deg) translateX(-480px);
            opacity: 0;
          }
        }

        @keyframes flyingMeteor2 {
          0% {
            transform: rotate(-30deg) translateX(0);
            opacity: 0;
          }
          1.5% {
            opacity: 0.3;
          }
          5% {
            transform: rotate(-30deg) translateX(-420px);
            opacity: 0;
          }
          100% {
            transform: rotate(-30deg) translateX(-420px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

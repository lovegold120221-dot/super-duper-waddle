import React from 'react';

// Realistic Human Agent Avatars with transparent backgrounds
export const AgentAvatars = {
  // Nexus - Manager & Orchestrator (Professional male manager, 30s)
  Nexus: () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair */}
      <path d="M32 8C25 8 20 12 20 18C20 22 22 24 24 25L18 28C18 28 16 32 16 36C16 42 20 46 26 48L38 48C44 46 48 42 48 36C48 32 46 28 46 28L40 25C42 24 44 22 44 18C44 12 39 8 32 8Z" fill="#2c1810"/>
      {/* Face */}
      <ellipse cx="32" cy="32" rx="12" ry="14" fill="#f4d1ae"/>
      {/* Eyes */}
      <ellipse cx="28" cy="30" rx="2" ry="3" fill="#1a1a1a"/>
      <ellipse cx="36" cy="30" rx="2" ry="3" fill="#1a1a1a"/>
      {/* Eyebrows */}
      <path d="M26 27L30 26M34 26L38 27" stroke="#2c1810" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M32 32L31 35L33 35" stroke="#d4a373" strokeWidth="1" strokeLinecap="round"/>
      {/* Mouth */}
      <path d="M28 38Q32 40 36 38" stroke="#8b4513" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Neck */}
      <rect x="28" y="44" width="8" height="8" fill="#f4d1ae"/>
      {/* Shirt collar */}
      <path d="M24 48L32 52L40 48" fill="#2563eb"/>
      {/* Suit */}
      <path d="M20 52L44 52L44 64L20 64Z" fill="#1e40af"/>
      {/* Tie */}
      <rect x="30" y="52" width="4" height="12" fill="#dc2626"/>
    </svg>
  ),

  // Atlas - Product Strategist (Professional male, 40s, analytical)
  Atlas: () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair */}
      <path d="M32 10C26 10 22 14 22 20C22 24 23 26 25 27L19 30C19 30 17 34 17 38C17 44 21 48 27 50L37 50C43 48 47 44 47 38C47 34 45 30 45 30L39 27C41 26 42 24 42 20C42 14 38 10 32 10Z" fill="#4a4a4a"/>
      {/* Face */}
      <ellipse cx="32" cy="32" rx="11" ry="13" fill="#e8d5c4"/>
      {/* Glasses */}
      <circle cx="28" cy="30" r="4" fill="none" stroke="#333" strokeWidth="1"/>
      <circle cx="36" cy="30" r="4" fill="none" stroke="#333" strokeWidth="1"/>
      <path d="M32 30L32 30" stroke="#333" strokeWidth="1"/>
      {/* Eyes */}
      <ellipse cx="28" cy="30" rx="1.5" ry="2" fill="#1a1a1a"/>
      <ellipse cx="36" cy="30" rx="1.5" ry="2" fill="#1a1a1a"/>
      {/* Nose */}
      <path d="M32 32L31 34L33 34" stroke="#d4a373" strokeWidth="1" strokeLinecap="round"/>
      {/* Mouth */}
      <path d="M29 37Q32 38 35 37" stroke="#8b4513" strokeWidth="1" strokeLinecap="round" fill="none"/>
      {/* Neck */}
      <rect x="29" y="44" width="6" height="7" fill="#e8d5c4"/>
      {/* Shirt */}
      <path d="M23 49L32 53L41 49L41 64L23 64Z" fill="#f97316"/>
      {/* Collar */}
      <path d="M26 49L32 52L38 49" fill="#ea580c"/>
    </svg>
  ),

  // Echo - Execution Engineer (Female, late 20s, tech-savvy)
  Echo: () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair */}
      <path d="M32 6C24 6 18 12 18 20C18 24 20 26 22 27L16 30C16 30 14 34 14 38C14 44 18 48 24 50L40 50C46 48 50 44 50 38C50 34 48 30 48 30L42 27C44 26 46 24 46 20C46 12 40 6 32 6Z" fill="#8b4513"/>
      {/* Face */}
      <ellipse cx="32" cy="32" rx="12" ry="14" fill="#fdbcb4"/>
      {/* Eyes */}
      <ellipse cx="28" cy="30" rx="2" ry="2.5" fill="#1a1a1a"/>
      <ellipse cx="36" cy="30" rx="2" ry="2.5" fill="#1a1a1a"/>
      {/* Eyelashes */}
      <path d="M26 28L28 27M34 27L36 28" stroke="#333" strokeWidth="0.5" strokeLinecap="round"/>
      {/* Eyebrows */}
      <path d="M26 26L30 25M34 25L38 26" stroke="#8b4513" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M32 32L31 35L33 35" stroke="#f4a460" strokeWidth="1" strokeLinecap="round"/>
      {/* Mouth */}
      <path d="M28 38Q32 40 36 38" stroke="#dc143c" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Neck */}
      <rect x="28" y="44" width="8" height="7" fill="#fdbcb4"/>
      {/* Shirt */}
      <path d="M22 49L32 54L42 49L42 64L22 64Z" fill="#a855f7"/>
      {/* Headphones */}
      <path d="M16 28C16 20 22 16 32 16C42 16 48 20 48 28" fill="none" stroke="#333" strokeWidth="2"/>
      <circle cx="16" cy="28" r="3" fill="#333"/>
      <circle cx="48" cy="28" r="3" fill="#333"/>
    </svg>
  ),

  // Veda - System Architect (Male, 50s, experienced)
  Veda: () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair (graying temples) */}
      <path d="M32 12C26 12 22 16 22 22C22 26 23 28 25 29L19 32C19 32 17 36 17 40C17 46 21 50 27 52L37 50C43 48 47 44 47 40C47 36 45 32 45 32L39 29C41 28 42 26 42 22C42 16 38 12 32 12Z" fill="#696969"/>
      {/* Gray temples */}
      <path d="M22 20C22 16 26 14 30 14C26 14 22 16 22 20Z" fill="#d3d3d3"/>
      <path d="M42 20C42 16 38 14 34 14C38 14 42 16 42 20Z" fill="#d3d3d3"/>
      {/* Face */}
      <ellipse cx="32" cy="32" rx="11" ry="13" fill="#daa520"/>
      {/* Wrinkles */}
      <path d="M26 26L30 25" stroke="#8b7355" strokeWidth="0.5" strokeLinecap="round"/>
      <path d="M34 25L38 26" stroke="#8b7355" strokeWidth="0.5" strokeLinecap="round"/>
      <path d="M30 36L34 36" stroke="#8b7355" strokeWidth="0.5" strokeLinecap="round"/>
      {/* Eyes */}
      <ellipse cx="28" cy="30" rx="1.5" ry="2" fill="#1a1a1a"/>
      <ellipse cx="36" cy="30" rx="1.5" ry="2" fill="#1a1a1a"/>
      {/* Eyebrows */}
      <path d="M26 27L30 26M34 26L38 27" stroke="#696969" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M32 32L31 34L33 34" stroke="#cd853f" strokeWidth="1" strokeLinecap="round"/>
      {/* Mouth */}
      <path d="M28 38Q32 39 36 38" stroke="#8b4513" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Neck */}
      <rect x="29" y="44" width="6" height="6" fill="#daa520"/>
      {/* Shirt */}
      <path d="M23 48L32 52L41 48L41 64L23 64Z" fill="#10b981"/>
      {/* Glasses */}
      <circle cx="28" cy="30" r="3.5" fill="none" stroke="#333" strokeWidth="1"/>
      <circle cx="36" cy="30" r="3.5" fill="none" stroke="#333" strokeWidth="1"/>
      <path d="M31.5 30L32.5 30" stroke="#333" strokeWidth="1"/>
    </svg>
  ),

  // Nova - UX Specialist (Female, early 30s, creative)
  Nova: () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Colorful hair */}
      <path d="M32 8C25 8 20 13 20 21C20 25 22 27 24 28L18 31C18 31 16 35 16 39C16 45 20 49 26 51L38 51C44 49 48 45 48 39C48 35 46 31 46 31L40 28C42 27 44 25 44 21C44 13 39 8 32 8Z" fill="#ff69b4"/>
      {/* Face */}
      <ellipse cx="32" cy="32" rx="12" ry="14" fill="#ffe4e1"/>
      {/* Eyes */}
      <ellipse cx="28" cy="30" rx="2" ry="2.5" fill="#1a1a1a"/>
      <ellipse cx="36" cy="30" rx="2" ry="2.5" fill="#1a1a1a"/>
      {/* Sparkle in eyes */}
      <circle cx="29" cy="29" r="0.5" fill="white"/>
      <circle cx="37" cy="29" r="0.5" fill="white"/>
      {/* Eyelashes */}
      <path d="M26 28L28 27M34 27L36 28" stroke="#333" strokeWidth="0.5" strokeLinecap="round"/>
      {/* Eyebrows */}
      <path d="M26 26L30 25M34 25L38 26" stroke="#ff1493" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M32 32L31 35L33 35" stroke="#ffa07a" strokeWidth="1" strokeLinecap="round"/>
      {/* Smile */}
      <path d="M27 38Q32 41 37 38" stroke="#ff1493" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Freckles */}
      <circle cx="25" cy="33" r="0.5" fill="#ffa07a"/>
      <circle cx="39" cy="33" r="0.5" fill="#ffa07a"/>
      <circle cx="27" cy="35" r="0.5" fill="#ffa07a"/>
      <circle cx="37" cy="35" r="0.5" fill="#ffa07a"/>
      {/* Neck */}
      <rect x="28" y="45" width="8" height="6" fill="#ffe4e1"/>
      {/* Colorful shirt */}
      <path d="M22 49L32 54L42 49L42 64L22 64Z" fill="#eab308"/>
      {/* Earring */}
      <circle cx="20" cy="32" r="1" fill="#ffd700"/>
    </svg>
  ),

  // Cipher - Reality Checker (Male, 35s, sharp/intense)
  Cipher: () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Short, neat hair */}
      <path d="M32 14C27 14 24 17 24 22L24 26L20 28C20 28 18 32 18 36C18 42 22 46 28 48L36 48C42 46 46 42 46 36C46 32 44 28 44 28L40 26L40 22C40 17 37 14 32 14Z" fill="#000000"/>
      {/* Face */}
      <ellipse cx="32" cy="32" rx="10" ry="12" fill="#f5deb3"/>
      {/* Sharp eyes */}
      <ellipse cx="29" cy="30" rx="1.5" ry="2" fill="#1a1a1a"/>
      <ellipse cx="35" cy="30" rx="1.5" ry="2" fill="#1a1a1a"/>
      {/* Intense eyebrows */}
      <path d="M27 27L30 26M34 26L37 27" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M32 32L31 34L33 34" stroke="#daa520" strokeWidth="1" strokeLinecap="round"/>
      {/* Serious mouth */}
      <path d="M30 38L34 38" stroke="#8b4513" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Neck */}
      <rect x="30" y="44" width="4" height="6" fill="#f5deb3"/>
      {/* Shirt */}
      <path d="M24 48L32 52L40 48L40 64L24 64Z" fill="#06b6d4"/>
      {/* Glasses */}
      <rect x="25" y="28" width="6" height="4" rx="1" fill="none" stroke="#333" strokeWidth="1"/>
      <rect x="33" y="28" width="6" height="4" rx="1" fill="none" stroke="#333" strokeWidth="1"/>
      <path d="M31 30L33 30" stroke="#333" strokeWidth="1"/>
      {/* Stubble */}
      <path d="M28 36L36 36" stroke="#666" strokeWidth="0.5" opacity="0.5"/>
    </svg>
  )
};

export default AgentAvatars;

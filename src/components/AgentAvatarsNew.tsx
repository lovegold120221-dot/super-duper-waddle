import React from 'react';

// Photorealistic Professional Agent Avatars
// Each avatar is tailored to the agent's specific character and role

export const AgentAvatars = {
  // Nexus - Manager & Orchestrator
  // Character: Charismatic, professional, late 30s, confident, business leader
  Nexus: () => (
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nexusSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d0c5"/>
          <stop offset="50%" stopColor="#e8b4a2"/>
          <stop offset="100%" stopColor="#d4a085"/>
        </linearGradient>
        <radialGradient id="nexusHair" cx="30%" cy="20%">
          <stop offset="0%" stopColor="#3d2314"/>
          <stop offset="100%" stopColor="#1a0f08"/>
        </radialGradient>
        <linearGradient id="nexusSuit" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
      </defs>
      
      {/* Professional suit */}
      <path d="M15 55 L25 48 L40 52 L55 48 L65 55 L68 80 L12 80 Z" fill="url(#nexusSuit)"/>
      <path d="M35 52 L40 75 L45 52" fill="#1e40af"/>
      
      {/* White shirt collar */}
      <path d="M28 48 L40 55 L52 48 L48 42 L40 48 L32 42 Z" fill="#ffffff"/>
      
      {/* Red power tie */}
      <path d="M38 48 L42 48 L41 70 L39 70 Z" fill="#dc2626"/>
      <path d="M37 45 L43 45 L41 48 L39 48 Z" fill="#b91c1c"/>
      
      {/* Neck */}
      <path d="M32 38 L48 38 L47 48 L33 48 Z" fill="url(#nexusSkin)"/>
      
      {/* Face shape - oval, confident */}
      <ellipse cx="40" cy="28" rx="14" ry="18" fill="url(#nexusSkin)"/>
      
      {/* Jawline - strong, defined */}
      <path d="M28 32 Q40 48 52 32" fill="none" stroke="#c4956a" strokeWidth="0.5" opacity="0.6"/>
      
      {/* Professional hairstyle - neatly styled, business cut */}
      <path d="M26 18 Q40 8 54 18 Q58 22 56 28 Q56 20 52 16 Q40 12 28 16 Q24 20 24 28 Q22 22 26 18" fill="url(#nexusHair)"/>
      <path d="M26 20 Q40 14 54 20" fill="none" stroke="#4a3728" strokeWidth="0.5"/>
      
      {/* Sideburns */}
      <rect x="26" y="22" width="2" height="6" fill="url(#nexusHair)" rx="1"/>
      <rect x="52" y="22" width="2" height="6" fill="url(#nexusHair)" rx="1"/>
      
      {/* Eyebrows - confident, arched */}
      <path d="M29 23 Q33 21 37 23" fill="none" stroke="#2d1810" strokeWidth="2" strokeLinecap="round"/>
      <path d="M43 23 Q47 21 51 23" fill="none" stroke="#2d1810" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Eyes - sharp, focused, brown */}
      <ellipse cx="33" cy="27" rx="3" ry="2.5" fill="#ffffff"/>
      <ellipse cx="47" cy="27" rx="3" ry="2.5" fill="#ffffff"/>
      <ellipse cx="33" cy="27" rx="2" ry="2" fill="#5d4037"/>
      <ellipse cx="47" cy="27" rx="2" ry="2" fill="#5d4037"/>
      <circle cx="34" cy="26" r="0.8" fill="#ffffff" opacity="0.8"/>
      <circle cx="48" cy="26" r="0.8" fill="#ffffff" opacity="0.8"/>
      
      {/* Nose - straight, prominent */}
      <path d="M40 28 L38 34 L42 34 Z" fill="#d4a085"/>
      <path d="M38 34 Q40 36 42 34" fill="none" stroke="#c4956a" strokeWidth="1"/>
      
      {/* Mouth - confident smile */}
      <path d="M35 38 Q40 41 45 38" fill="none" stroke="#a67c52" strokeWidth="2" strokeLinecap="round"/>
      <path d="M36 39 Q40 40 44 39" fill="#d4a085" opacity="0.5"/>
      
      {/* 5 o'clock shadow - rugged but professional */}
      <path d="M30 35 Q40 42 50 35" fill="none" stroke="#8d6e63" strokeWidth="0.5" opacity="0.3"/>
    </svg>
  ),

  // Atlas - Product Strategist  
  // Character: Analytical, thoughtful, early 40s, intellectual, glasses
  Atlas: () => (
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="atlasSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fae5d3"/>
          <stop offset="100%" stopColor="#e6b89c"/>
        </linearGradient>
        <linearGradient id="atlasHair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a5568"/>
          <stop offset="100%" stopColor="#2d3748"/>
        </linearGradient>
      </defs>
      
      {/* Smart casual blazer */}
      <path d="M12 58 L25 50 L40 54 L55 50 L68 58 L70 80 L10 80 Z" fill="#7c2d12"/>
      <path d="M35 54 L40 75 L45 54" fill="#9a3412"/>
      
      {/* Light blue shirt */}
      <path d="M25 50 L40 58 L55 50 L52 44 L40 52 L28 44 Z" fill="#dbeafe"/>
      
      {/* Open collar - no tie, relaxed but professional */}
      <path d="M37 52 L40 62 L43 52" fill="#dbeafe"/>
      
      {/* Neck */}
      <path d="M33 40 L47 40 L46 50 L34 50 Z" fill="url(#atlasSkin)"/>
      
      {/* Face - slightly angular, intellectual */}
      <path d="M28 20 L52 20 L50 42 L30 42 Z" fill="url(#atlasSkin)"/>
      <ellipse cx="40" cy="30" rx="12" ry="16" fill="url(#atlasSkin)"/>
      
      {/* Hair - slightly graying at temples, neatly combed */}
      <path d="M26 18 Q40 10 54 18 Q56 24 54 28 Q54 16 48 14 Q40 12 32 14 Q26 16 26 28 Q24 24 26 18" fill="url(#atlasHair)"/>
      {/* Gray temples */}
      <path d="M26 20 Q30 18 28 24" fill="none" stroke="#a0aec0" strokeWidth="2" opacity="0.7"/>
      <path d="M54 20 Q50 18 52 24" fill="none" stroke="#a0aec0" strokeWidth="2" opacity="0.7"/>
      
      {/* Eyebrows - thoughtful, slightly furrowed */}
      <path d="M30 24 Q34 23 38 24" fill="none" stroke="#4a5568" strokeWidth="2" strokeLinecap="round"/>
      <path d="M42 24 Q46 23 50 24" fill="none" stroke="#4a5568" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Eyes - thoughtful, blue, behind glasses */}
      <ellipse cx="34" cy="28" rx="3" ry="2.5" fill="#ffffff"/>
      <ellipse cx="46" cy="28" rx="3" ry="2.5" fill="#ffffff"/>
      <ellipse cx="34" cy="28" rx="2" ry="1.8" fill="#3182ce"/>
      <ellipse cx="46" cy="28" rx="2" ry="1.8" fill="#3182ce"/>
      
      {/* Intellectual glasses - rectangular frames */}
      <rect x="30" y="25" width="8" height="6" fill="none" stroke="#2d3748" strokeWidth="1.5" rx="1"/>
      <rect x="42" y="25" width="8" height="6" fill="none" stroke="#2d3748" strokeWidth="1.5" rx="1"/>
      <line x1="38" y1="28" x2="42" y2="28" stroke="#2d3748" strokeWidth="1.5"/>
      <line x1="30" y1="28" x2="26" y2="27" stroke="#2d3748" strokeWidth="1"/>
      <line x1="50" y1="28" x2="54" y2="27" stroke="#2d3748" strokeWidth="1"/>
      
      {/* Nose - straight, analytical */}
      <path d="M40 29 L38 35 L42 35 Z" fill="#d4a085"/>
      
      {/* Mouth - slight thoughtful frown */}
      <path d="M36 40 Q40 39 44 40" fill="none" stroke="#a67c52" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  // Echo - Execution Engineer
  // Character: Energetic, practical, late 20s, tech-savvy, approachable
  Echo: () => (
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="echoSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe4d6"/>
          <stop offset="100%" stopColor="#fdb4a2"/>
        </linearGradient>
        <linearGradient id="echoHair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b4513"/>
          <stop offset="100%" stopColor="#5d2e0c"/>
        </linearGradient>
      </defs>
      
      {/* Purple hoodie - casual tech worker */}
      <path d="M10 60 L22 50 L40 56 L58 50 L70 60 L72 80 L8 80 Z" fill="#7c3aed"/>
      <path d="M35 56 L40 75 L45 56" fill="#6d28d9"/>
      
      {/* Hood strings */}
      <path d="M38 56 L38 70" stroke="#a78bfa" strokeWidth="2"/>
      <path d="M42 56 L42 70" stroke="#a78bfa" strokeWidth="2"/>
      
      {/* Neck */}
      <path d="M32 42 L48 42 L47 52 L33 52 Z" fill="url(#echoSkin)"/>
      
      {/* Face - youthful, energetic, oval */}
      <ellipse cx="40" cy="32" rx="13" ry="17" fill="url(#echoSkin)"/>
      
      {/* Hair - shoulder length, auburn, slightly messy */}
      <path d="M24 25 Q40 10 56 25 Q60 35 58 45 Q58 25 52 20 Q40 15 28 20 Q22 25 22 45 Q20 35 24 25" fill="url(#echoHair)"/>
      {/* Wavy hair texture */}
      <path d="M25 30 Q30 28 35 30 Q40 32 45 30" fill="none" stroke="#6b3410" strokeWidth="1" opacity="0.5"/>
      
      {/* Side bangs */}
      <path d="M24 28 L26 40 L28 28" fill="#8b4513"/>
      <path d="M56 28 L54 40 L52 28" fill="#8b4513"/>
      
      {/* Eyebrows - expressive, raised */}
      <path d="M30 26 Q34 24 38 26" fill="none" stroke="#5d2e0c" strokeWidth="2" strokeLinecap="round"/>
      <path d="M42 26 Q46 24 50 26" fill="none" stroke="#5d2e0c" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Eyes - bright, hazel, enthusiastic */}
      <ellipse cx="34" cy="30" rx="3.5" ry="3" fill="#ffffff"/>
      <ellipse cx="46" cy="30" rx="3.5" ry="3" fill="#ffffff"/>
      <ellipse cx="34" cy="30" rx="2.5" ry="2.2" fill="#8b6914"/>
      <ellipse cx="46" cy="30" rx="2.5" ry="2.2" fill="#8b6914"/>
      <circle cx="35" cy="29" r="1" fill="#ffffff" opacity="0.9"/>
      <circle cx="47" cy="29" r="1" fill="#ffffff" opacity="0.9"/>
      
      {/* Nose - small, cute */}
      <path d="M40 32 L38 36 L42 36 Z" fill="#fdb4a2"/>
      
      {/* Mouth - big friendly smile */}
      <path d="M34 40 Q40 45 46 40" fill="none" stroke="#c53030" strokeWidth="2" strokeLinecap="round"/>
      <path d="M36 41 Q40 43 44 41" fill="#f56565" opacity="0.5"/>
      
      {/* Freckles */}
      <circle cx="28" cy="34" r="0.6" fill="#d69e8a" opacity="0.7"/>
      <circle cx="30" cy="36" r="0.5" fill="#d69e8a" opacity="0.7"/>
      <circle cx="52" cy="34" r="0.6" fill="#d69e8a" opacity="0.7"/>
      <circle cx="50" cy="36" r="0.5" fill="#d69e8a" opacity="0.7"/>
    </svg>
  ),

  // Veda - System Architect
  // Character: Wise, experienced, early 50s, salt-and-pepper hair, mentor
  Veda: () => (
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vedaSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8d5c4"/>
          <stop offset="50%" stopColor="#d4b896"/>
          <stop offset="100%" stopColor="#c4a57b"/>
        </linearGradient>
        <linearGradient id="vedaHair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5a5a5a"/>
          <stop offset="50%" stopColor="#757575"/>
          <stop offset="100%" stopColor="#4a4a4a"/>
        </linearGradient>
      </defs>
      
      {/* Green sweater - wise, earthy */}
      <path d="M12 58 L25 50 L40 56 L55 50 L68 58 L70 80 L10 80 Z" fill="#166534"/>
      <path d="M37 56 L40 72 L43 56" fill="#14532d"/>
      
      {/* Collar detail */}
      <path d="M32 52 L40 58 L48 52" fill="#15803d"/>
      
      {/* Neck - mature */}
      <path d="M33 42 L47 42 L46 52 L34 52 Z" fill="url(#vedaSkin)"/>
      
      {/* Face - weathered, experienced, wise */}
      <ellipse cx="40" cy="32" rx="12" ry="16" fill="url(#vedaSkin)"/>
      
      {/* Wisdom lines */}
      <path d="M28 28 Q32 27 36 28" fill="none" stroke="#b8956a" strokeWidth="0.8" opacity="0.6"/>
      <path d="M44 28 Q48 27 52 28" fill="none" stroke="#b8956a" strokeWidth="0.8" opacity="0.6"/>
      <path d="M36 38 Q40 40 44 38" fill="none" stroke="#b8956a" strokeWidth="0.6" opacity="0.5"/>
      
      {/* Salt and pepper hair - dignified, thinning slightly */}
      <path d="M26 20 Q40 12 54 20 Q56 26 54 32 Q54 18 48 16 Q40 14 32 16 Q26 18 26 32 Q24 26 26 20" fill="url(#vedaHair)"/>
      {/* Gray highlights */}
      <path d="M28 18 Q35 16 40 18 Q45 16 52 18" fill="none" stroke="#9ca3af" strokeWidth="3" opacity="0.6"/>
      <path d="M30 22 Q40 20 50 22" fill="none" stroke="#d1d5db" strokeWidth="2" opacity="0.5"/>
      
      {/* Sideburns - graying */}
      <rect x="27" y="24" width="2.5" height="8" fill="#6b7280" rx="1"/>
      <rect x="50.5" y="24" width="2.5" height="8" fill="#6b7280" rx="1"/>
      
      {/* Eyebrows - wise, bushy, gray */}
      <path d="M29 26 Q33 24 37 26" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M43 26 Q47 24 51 26" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Eyes - warm brown, experienced, behind reading glasses */}
      <ellipse cx="34" cy="30" rx="3" ry="2.5" fill="#ffffff"/>
      <ellipse cx="46" cy="30" rx="3" ry="2.5" fill="#ffffff"/>
      <ellipse cx="34" cy="30" rx="2" ry="1.8" fill="#5d4037"/>
      <ellipse cx="46" cy="30" rx="2" ry="1.8" fill="#5d4037"/>
      
      {/* Reading glasses - classic, thin frames */}
      <circle cx="34" cy="30" r="4" fill="none" stroke="#4b5563" strokeWidth="1" opacity="0.8"/>
      <circle cx="46" cy="30" r="4" fill="none" stroke="#4b5563" strokeWidth="1" opacity="0.8"/>
      <line x1="38" y1="30" x2="42" y2="30" stroke="#4b5563" strokeWidth="1"/>
      
      {/* Nose - prominent, distinguished */}
      <path d="M40 31 L38 37 L42 37 Z" fill="#c4a57b"/>
      <path d="M37 37 Q40 39 43 37" fill="none" stroke="#b8956a" strokeWidth="1"/>
      
      {/* Mouth - kind, patient smile */}
      <path d="M35 42 Q40 44 45 42" fill="none" stroke="#a67c52" strokeWidth="1.5" strokeLinecap="round"/>
      
      {/* Beard stubble - salt and pepper */}
      <path d="M32 40 Q40 46 48 40" fill="none" stroke="#9ca3af" strokeWidth="0.5" opacity="0.4"/>
    </svg>
  ),

  // Nova - UX Specialist
  // Character: Creative, vibrant, early 30s, colorful, artistic
  Nova: () => (
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="novaSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff5eb"/>
          <stop offset="100%" stopColor="#ffe4cc"/>
        </linearGradient>
        <linearGradient id="novaHair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899"/>
          <stop offset="50%" stopColor="#f472b6"/>
          <stop offset="100%" stopColor="#db2777"/>
        </linearGradient>
      </defs>
      
      {/* Yellow creative top */}
      <path d="M12 58 L24 50 L40 56 L56 50 L68 58 L70 80 L10 80 Z" fill="#eab308"/>
      <path d="M36 56 L40 70 L44 56" fill="#ca8a04"/>
      
      {/* Artistic necklace */}
      <circle cx="40" cy="58" r="3" fill="#fbbf24"/>
      <path d="M40 56 L40 61" stroke="#f59e0b" strokeWidth="1"/>
      
      {/* Neck */}
      <path d="M32 42 L48 42 L47 52 L33 52 Z" fill="url(#novaSkin)"/>
      
      {/* Face - youthful, expressive, heart-shaped */}
      <ellipse cx="40" cy="32" rx="12" ry="16" fill="url(#novaSkin)"/>
      
      {/* Pink ombre hair - creative, bold */}
      <path d="M24 22 Q40 8 56 22 Q60 32 58 42 Q58 20 50 16 Q40 12 30 16 Q22 20 22 42 Q20 32 24 22" fill="url(#novaHair)"/>
      {/* Highlights */}
      <path d="M28 18 Q35 15 40 18 Q45 15 52 18" fill="none" stroke="#fce7f3" strokeWidth="3" opacity="0.6"/>
      <path d="M30 24 Q40 21 50 24" fill="none" stroke="#fbcfe8" strokeWidth="2" opacity="0.5"/>
      
      {/* Side pieces */}
      <path d="M24 28 L26 45 L28 28" fill="#db2777"/>
      <path d="M56 28 L54 45 L52 28" fill="#db2777"/>
      
      {/* Eyebrows - expressive, pink tinted */}
      <path d="M30 26 Q34 24 38 26" fill="none" stroke="#be185d" strokeWidth="2" strokeLinecap="round"/>
      <path d="M42 26 Q46 24 50 26" fill="none" stroke="#be185d" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Eyes - bright green, creative spark */}
      <ellipse cx="34" cy="30" rx="3.5" ry="3" fill="#ffffff"/>
      <ellipse cx="46" cy="30" rx="3.5" ry="3" fill="#ffffff"/>
      <ellipse cx="34" cy="30" rx="2.5" ry="2.2" fill="#22c55e"/>
      <ellipse cx="46" cy="30" rx="2.5" ry="2.2" fill="#22c55e"/>
      <circle cx="35" cy="29" r="1" fill="#ffffff" opacity="0.9"/>
      <circle cx="47" cy="29" r="1" fill="#ffffff" opacity="0.9"/>
      {/* Creative eyeliner */}
      <path d="M30 30 L32 28" stroke="#db2777" strokeWidth="1"/>
      <path d="M50 30 L48 28" stroke="#db2777" strokeWidth="1"/>
      
      {/* Nose - cute, small */}
      <path d="M40 32 L38 36 L42 36 Z" fill="#fdba74"/>
      
      {/* Mouth - bright smile */}
      <path d="M35 40 Q40 44 45 40" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round"/>
      <path d="M37 41 Q40 42 43 41" fill="#fca5a5" opacity="0.6"/>
      
      {/* Artistic freckles */}
      <circle cx="28" cy="33" r="0.7" fill="#fb923c" opacity="0.6"/>
      <circle cx="30" cy="36" r="0.5" fill="#fb923c" opacity="0.6"/>
      <circle cx="52" cy="33" r="0.7" fill="#fb923c" opacity="0.6"/>
      <circle cx="50" cy="36" r="0.5" fill="#fb923c" opacity="0.6"/>
      <circle cx="32" cy="34" r="0.4" fill="#fbbf24" opacity="0.5"/>
      <circle cx="48" cy="34" r="0.4" fill="#fbbf24" opacity="0.5"/>
      
      {/* Creative earring */}
      <circle cx="23" cy="32" r="2" fill="#fbbf24"/>
      <circle cx="23" cy="35" r="1" fill="#f59e0b"/>
    </svg>
  ),

  // Cipher - Reality Checker
  // Character: Sharp, skeptical, mid 30s, intense, detective-like
  Cipher: () => (
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cipherSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5deb3"/>
          <stop offset="100%" stopColor="#daa520"/>
        </linearGradient>
        <radialGradient id="cipherHair" cx="50%" cy="20%">
          <stop offset="0%" stopColor="#1a1a1a"/>
          <stop offset="100%" stopColor="#000000"/>
        </radialGradient>
      </defs>
      
      {/* Dark gray turtleneck - mysterious, serious */}
      <path d="M10 60 L24 50 L40 56 L56 50 L70 60 L72 80 L8 80 Z" fill="#374151"/>
      <path d="M37 56 L40 72 L43 56" fill="#1f2937"/>
      
      {/* High collar */}
      <rect x="32" y="45" width="16" height="12" fill="#4b5563" rx="2"/>
      
      {/* Neck */}
      <path d="M33 42 L47 42 L46 48 L34 48 Z" fill="url(#cipherSkin)"/>
      
      {/* Face - angular, sharp features */}
      <path d="M28 18 L52 18 L48 42 L32 42 Z" fill="url(#cipherSkin)"/>
      
      {/* Hair - jet black, slicked back, severe */}
      <path d="M26 16 Q40 8 54 16 Q56 22 54 28 Q54 14 48 12 Q40 10 32 12 Q26 14 26 28 Q24 22 26 16" fill="url(#cipherHair)"/>
      {/* Slicked back shine */}
      <path d="M30 14 Q40 12 50 14" fill="none" stroke="#4b5563" strokeWidth="2" opacity="0.5"/>
      
      {/* Intense sideburns */}
      <rect x="27" y="22" width="2" height="8" fill="#1a1a1a" rx="0.5"/>
      <rect x="51" y="22" width="2" height="8" fill="#1a1a1a" rx="0.5"/>
      
      {/* Eyebrows - sharp, skeptical, intense */}
      <path d="M29 26 L36 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M44 24 L51 26" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Eyes - piercing, gray, intense */}
      <ellipse cx="32.5" cy="30" rx="3" ry="2.5" fill="#ffffff"/>
      <ellipse cx="47.5" cy="30" rx="3" ry="2.5" fill="#ffffff"/>
      <ellipse cx="32.5" cy="30" rx="2" ry="1.8" fill="#6b7280"/>
      <ellipse cx="47.5" cy="30" rx="2" ry="1.8" fill="#6b7280"/>
      <circle cx="33.5" cy="29" r="0.8" fill="#ffffff" opacity="0.7"/>
      <circle cx="48.5" cy="29" r="0.8" fill="#ffffff" opacity="0.7"/>
      
      {/* Serious glasses - thin wire frames */}
      <rect x="28" y="27" width="9" height="6" fill="none" stroke="#4b5563" strokeWidth="1" rx="0.5"/>
      <rect x="43" y="27" width="9" height="6" fill="none" stroke="#4b5563" strokeWidth="1" rx="0.5"/>
      <line x1="37" y1="30" x2="43" y2="30" stroke="#4b5563" strokeWidth="1"/>
      
      {/* Nose - sharp, prominent */}
      <path d="M40 31 L38 37 L42 37 Z" fill="#c4a35a"/>
      <path d="M38 37 L42 37" stroke="#b8941d" strokeWidth="1"/>
      
      {/* Mouth - thin, skeptical line */}
      <path d="M36 42 L44 42" fill="none" stroke="#8b6914" strokeWidth="1.5" strokeLinecap="round"/>
      
      {/* Intense jawline */}
      <path d="M30 38 L40 44 L50 38" fill="none" stroke="#b8941d" strokeWidth="0.8" opacity="0.5"/>
      
      {/* 5 o'clock shadow */}
      <path d="M30 40 Q40 46 50 40" fill="none" stroke="#4b5563" strokeWidth="0.6" opacity="0.3"/>
    </svg>
  )
};

export default AgentAvatars;

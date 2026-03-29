import React from 'react';

// Agent avatar photos from Pixabay (royalty-free, stored locally)
// Pixabay Content License: https://pixabay.com/service/license-summary/

interface AvatarImgProps { hex?: string; }

const AvatarImg: React.FC<{ src: string; alt: string; hex?: string }> = ({
  src,
  alt,
  hex = '#3b82f6',
}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      overflow: 'hidden',
      border: `2px solid ${hex}44`,
      boxSizing: 'border-box',
    }}
  >
    <img
      src={src}
      alt={alt}
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
      draggable={false}
    />
  </div>
);

export const AgentAvatars = {
  // Nexus - Manager & Orchestrator
  Nexus: (props: AvatarImgProps) => (
    <AvatarImg src="/agents/nexus.jpg" alt="Nexus" hex={props.hex ?? '#3b82f6'} />
  ),

  // Atlas - Product Strategist
  Atlas: (props: AvatarImgProps) => (
    <AvatarImg src="/agents/atlas.jpg" alt="Atlas" hex={props.hex ?? '#f97316'} />
  ),

  // Echo - Execution Engineer
  Echo: (props: AvatarImgProps) => (
    <AvatarImg src="/agents/echo.jpg" alt="Echo" hex={props.hex ?? '#a855f7'} />
  ),

  // Veda - System Architect
  Veda: (props: AvatarImgProps) => (
    <AvatarImg src="/agents/veda.jpg" alt="Veda" hex={props.hex ?? '#10b981'} />
  ),

  // Nova - UX Specialist
  Nova: (props: AvatarImgProps) => (
    <AvatarImg src="/agents/nova.jpg" alt="Nova" hex={props.hex ?? '#eab308'} />
  ),

  // Cipher - Reality Checker
  Cipher: (props: AvatarImgProps) => (
    <AvatarImg src="/agents/cipher.jpg" alt="Cipher" hex={props.hex ?? '#06b6d4'} />
  ),
};

export default AgentAvatars;

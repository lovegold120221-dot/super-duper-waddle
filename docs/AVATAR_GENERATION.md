# Agent Avatar Image Generation Guide

## Overview
This document provides detailed prompts for generating realistic, character-tailored avatar images for each agent using AI image generation tools (Midjourney, DALL-E, Stable Diffusion, etc.)

## Generated Images

Place the generated images in: `/public/agents/`

### Nexus - Manager & Orchestrator
**Filename**: `nexus.png`

**Prompt**:
```
Professional portrait of a confident male business leader in his late 30s, 
wearing a tailored navy blue suit with a crisp white shirt and red power tie, 
warm olive skin tone, short neatly styled dark brown hair with subtle side part, 
strong defined jawline, sharp brown eyes with confident gaze, slight 5 o'clock shadow, 
charismatic smile showing approachability and authority, corporate office background 
blurred bokeh effect, studio lighting, photorealistic, 8k quality, professional 
headshot style, 3/4 angle view, warm color grading
```

**Negative Prompt**:
```
cartoon, anime, illustration, drawing, painting, sketch, 3d render, unrealistic, 
plastic skin, smooth skin, perfect skin, filters, instagram, snapchat, oversaturated, 
blurry, low quality, watermark, text, logo
```

### Atlas - Product Strategist
**Filename**: `atlas.png`

**Prompt**:
```
Professional portrait of an intellectual male in his early 40s, salt-and-pepper 
hair graying at temples, wearing smart casual rust-colored blazer over light 
blue open-collar shirt, fair skin with natural texture, rectangular thin-frame 
glasses, thoughtful blue eyes slightly squinted in analysis, subtle forehead 
lines showing wisdom, intelligent contemplative expression, modern minimalist 
office background, natural window lighting, photorealistic, 8k quality, 
professional headshot, slight 3/4 angle, warm neutral tones
```

**Negative Prompt**:
```
cartoon, anime, illustration, drawing, painting, sketch, 3d render, unrealistic, 
smooth skin, plastic look, filters, oversaturated, blurry, low quality, watermark, 
text, logo, young, no glasses
```

### Echo - Execution Engineer
**Filename**: `echo.png`

**Prompt**:
```
Professional portrait of an energetic young woman in her late 20s, shoulder-length 
auburn wavy hair with natural highlights, wearing casual purple hoodie, fair skin 
with light freckles across nose and cheeks, bright hazel-green eyes full of 
enthusiasm, warm genuine smile showing teeth, approachable friendly expression, 
tech startup office background with monitors blurred, natural lighting from 
large windows, photorealistic, 8k quality, professional headshot style, slight 
angle, vibrant but natural colors
```

**Negative Prompt**:
```
cartoon, anime, illustration, drawing, painting, sketch, 3d render, unrealistic, 
plastic skin, heavy makeup, filters, oversaturated, blurry, low quality, watermark, 
text, logo, formal wear, old
```

### Veda - System Architect
**Filename**: `veda.png`

**Prompt**:
```
Professional portrait of a wise experienced male mentor in his early 50s, 
salt-and-pepper hair with distinguished gray, wearing forest green cable-knit 
sweater, warm tan skin with natural age lines and wisdom wrinkles around eyes, 
kind brown eyes behind classic thin-frame reading glasses, patient benevolent 
smile, distinguished appearance, library or study background with books blurred, 
soft warm lighting, photorealistic, 8k quality, professional headshot, straight-on 
angle, earthy warm tones
```

**Negative Prompt**:
```
cartoon, anime, illustration, drawing, painting, sketch, 3d render, unrealistic, 
smooth skin, facelift, filters, oversaturated, blurry, low quality, watermark, 
text, logo, too young, no wrinkles
```

### Nova - UX Specialist
**Filename**: `nova.png`

**Prompt**:
```
Professional portrait of a creative vibrant woman in her early 30s, stylish 
pink ombre hair fading from dark roots to bright pink tips, wearing mustard 
yellow artistic top, fair porcelain skin with creative orange and gold freckles, 
bright emerald green eyes with artistic eyeliner, big expressive smile showing 
creativity and joy, artistic geometric gold earring, modern creative studio 
background with art supplies blurred, colorful but professional lighting, 
photorealistic, 8k quality, professional headshot style, dynamic angle, 
vibrant artistic color grading
```

**Negative Prompt**:
```
cartoon, anime, illustration, drawing, painting, sketch, 3d render, unrealistic, 
smooth skin, heavy makeup, gothic, emo, filters, oversaturated, blurry, low quality, 
watermark, text, logo, dull colors, corporate formal
```

### Cipher - Reality Checker
**Filename**: `cipher.png`

**Prompt**:
```
Professional portrait of an intense sharp-featured male in his mid 30s, jet black 
slicked-back hair severe style, wearing dark charcoal turtleneck sweater, 
olive skin tone with 5 o'clock shadow stubble, piercing gray eyes behind thin 
wire-frame glasses, thin skeptical serious mouth, intense analytical expression, 
detective-like appearance, noir style dark background, dramatic side lighting 
creating subtle shadows, photorealistic, 8k quality, professional headshot, 
sharp angle, moody desaturated tones
```

**Negative Prompt**:
```
cartoon, anime, illustration, drawing, painting, sketch, 3d render, unrealistic, 
smooth skin, smiling, bright colors, cheerful, filters, oversaturated, blurry, 
low quality, watermark, text, logo, beard, messy hair
```

## Image Requirements

### Technical Specifications
- **Format**: PNG with transparent background (or white background)
- **Resolution**: 512x512px minimum, 1024x1024px preferred
- **Aspect Ratio**: 1:1 (square)
- **Style**: Photorealistic professional headshot
- **Background**: Blurred bokeh effect or solid color

### Style Guidelines
- Photorealistic, not illustrated or cartoon
- Professional headshot style
- Natural skin textures (freckles, wrinkles, stubble where appropriate)
- Natural lighting (not overly bright or artificial)
- Character-appropriate clothing and styling
- Consistent quality across all agents

## Generation Tools

### Recommended AI Tools
1. **Midjourney v6**: Best for photorealistic portraits
2. **DALL-E 3**: Good for following detailed prompts
3. **Stable Diffusion XL**: Customizable with fine-tuning
4. **Adobe Firefly**: Commercial-safe outputs

### Example Generation Commands

**Midjourney**:
```
/imagine prompt: [prompt from above] --ar 1:1 --v 6 --style raw --no [negative prompt]
```

**DALL-E**:
Use the detailed prompts above as-is with DALL-E 3 for best results.

**Stable Diffusion**:
Use with RealisticVision or similar photorealistic checkpoint model.

## Post-Processing

After generating images:
1. Remove background (use remove.bg or similar)
2. Ensure consistent sizing (512x512px)
3. Export as PNG with transparency
4. Optimize file size (< 200KB each)
5. Place in `/public/agents/` directory

## React Component Integration

```typescript
// Update AgentAvatars.tsx to use actual images
export const AgentAvatars = {
  Nexus: () => <img src="/agents/nexus.png" alt="Nexus" className="agent-avatar" />,
  Atlas: () => <img src="/agents/atlas.png" alt="Atlas" className="agent-avatar" />,
  Echo: () => <img src="/agents/echo.png" alt="Echo" className="agent-avatar" />,
  Veda: () => <img src="/agents/veda.png" alt="Veda" className="agent-avatar" />,
  Nova: () => <img src="/agents/nova.png" alt="Nova" className="agent-avatar" />,
  Cipher: () => <img src="/agents/cipher.png" alt="Cipher" className="agent-avatar" />
};
```

## CSS Styling

```css
.agent-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--agent-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## Alternative: Stock Photos

If AI generation is not available, search for stock photos using these keywords:
- **Nexus**: "business professional male 30s suit confident"
- **Atlas**: "businessman 40s glasses thoughtful smart casual"
- **Echo**: "young professional woman 20s friendly casual tech"
- **Veda**: "mature businessman 50s wise mentor sweater"
- **Nova**: "creative professional woman 30s colorful artistic"
- **Cipher**: "serious professional male 30s intense detective"

Sites: Unsplash, Pexels, Shutterstock, Adobe Stock

---

**Note**: These prompts are optimized for creating realistic, character-appropriate 
professional headshots that match each agent's personality and role in the panel discussion.

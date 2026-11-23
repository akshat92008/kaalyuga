// ============================================================================
// PHASE 1 — PROCEDURAL UFOTABLE / DEMON SLAYER PAINTERLY BRUSHWORK TEXTURE ATLAS
// Generated once at startup via offscreen HTML5 Canvas (< 4 MB VRAM total, 0 404s):
// 1. Agni Calligraphic Flame Sheet (curling S-curve flame tongues + smoke hollows)
// 2. Varuna Ukiyo-e Hokusai Woodblock Wave & Clawed Seafoam Sheet
// 3. Vayu Razor Emerald Wind-Blade & Pitch-Black Sumi-e Tear-Streak Sheet
// 4. Vajra Angular Lightning Facet Sheet
// 5. Impact & Particle 2x2 Sprite Atlas (12-pt Manga Starburst, Ink Water Droplet,
//    Razor Tapered Anime Spark Streak, Shattered Stone Debris Shard)
// ============================================================================

import * as THREE from 'three';

export interface PainterlyVfxAtlas {
  flameSheet: THREE.CanvasTexture;
  waterWaveSheet: THREE.CanvasTexture;
  windBladeSheet: THREE.CanvasTexture;
  lightningSheet: THREE.CanvasTexture;
  impactSprites: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function configureTexture(
  canvas: HTMLCanvasElement,
  repeatX = true,
  isLinearData = false
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = repeatX ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = isLinearData ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 1. AGNI — Hinokami Kagura / Rengoku Calligraphic Flame Sheet (1024x512)
 * - R: Continuous sculptural flame mass + swept asymmetric S-curve flame tongues growing
 *      organically OUT of the outer trailing edge (zero detached floating blobs!)
 * - G: Luminous white-gold inner cutting spine & stepped fire ridges
 * - B: Dark charcoal smoke pockets nestled inside flame curl hollows
 * - A: Crisp brush silhouette alpha for fragment-shader sumi-e ink outline tracing
 */
function buildFlameSheetTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = makeCanvas(W, H);
  if (!c) return new THREE.CanvasTexture(new ImageData(2, 2) as unknown as HTMLCanvasElement);
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  // Paint continuous wavy fire ribbon body occupying v in [0.12 .. 0.78]
  // (y=0 in canvas corresponds to v=1 outer cutting edge in Three.js flipY=true!
  // Let's keep v=0 near bottom (inner blade root) and v=1 near top (outer flame crest).)
  const drawWavyBody = (
    topBase: number,
    botBase: number,
    fillStyle: string,
    ampTop: number,
    ampBot: number,
    phase: number
  ) => {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const u = (x / W) * Math.PI * 2;
      const waveTop =
        Math.sin(u * 3 + phase) * ampTop +
        Math.sin(u * 7 - phase * 1.3) * (ampTop * 0.42) +
        Math.cos(u * 11 + phase * 0.7) * (ampTop * 0.22);
      const y = topBase + waveTop;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = W; x >= 0; x -= 8) {
      const u = (x / W) * Math.PI * 2;
      const waveBot =
        Math.sin(u * 4 - phase * 0.8) * ampBot +
        Math.cos(u * 9 + phase) * (ampBot * 0.35);
      ctx.lineTo(x, botBase + waveBot);
    }
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
  };

  // Base red/alpha fire mass (R=255, G=70, B=0, A=1)
  drawWavyBody(H * 0.28, H * 0.84, 'rgba(255, 65, 0, 1.0)', 28, 16, 0.4);

  // Sculpted asymmetric S-curve curling flame tongues growing DIRECTLY out of the outer edge
  const tongueCount = 9;
  for (let i = 0; i < tongueCount; i++) {
    const baseX = ((i + 0.35) / tongueCount) * W;
    const tongueH = H * (0.20 + (i % 3) * 0.055);
    const curlBack = 58 + (i % 4) * 18;
    const baseW = 54 + (i % 3) * 14;
    const startY = H * 0.32;

    const paintTongue = (offsetX: number) => {
      const bx = baseX + offsetX;
      ctx.beginPath();
      ctx.moveTo(bx - baseW * 0.55, startY + 28);
      ctx.bezierCurveTo(
        bx - baseW * 0.38,
        startY - tongueH * 0.35,
        bx - curlBack * 0.55,
        startY - tongueH * 0.92,
        bx - curlBack,
        startY - tongueH
      );
      ctx.bezierCurveTo(
        bx - curlBack * 0.25,
        startY - tongueH * 0.72,
        bx + baseW * 0.24,
        startY - tongueH * 0.28,
        bx + baseW * 0.55,
        startY + 24
      );
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 115, 0, 1.0)';
      ctx.fill();

      // Inner bright yellow-gold lick riding inside each flame tongue (G channel high!)
      ctx.beginPath();
      ctx.moveTo(bx - baseW * 0.28, startY + 22);
      ctx.bezierCurveTo(
        bx - baseW * 0.16,
        startY - tongueH * 0.26,
        bx - curlBack * 0.38,
        startY - tongueH * 0.65,
        bx - curlBack * 0.68,
        startY - tongueH * 0.74
      );
      ctx.bezierCurveTo(
        bx - curlBack * 0.14,
        startY - tongueH * 0.48,
        bx + baseW * 0.1,
        startY - tongueH * 0.16,
        bx + baseW * 0.28,
        startY + 18
      );
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 225, 0, 1.0)';
      ctx.fill();
    };
    // Wrap seamlessly at x=0 and x=W
    paintTongue(0);
    if (baseX - curlBack < 20) paintTongue(W);
    if (baseX + baseW > W - 20) paintTongue(-W);
  }

  // Stepped bright yellow-orange mid-body flow band (G=200)
  drawWavyBody(H * 0.40, H * 0.76, 'rgba(255, 205, 0, 1.0)', 18, 12, 1.1);

  // Razor-crisp white-hot inner cutting spine (G=255) hugging the lower-mid curve
  drawWavyBody(H * 0.54, H * 0.69, 'rgba(255, 255, 0, 1.0)', 10, 7, 1.9);

  // Ufotable signature: Dark charcoal/ink flame hollows & negative-space curls encoded in Blue channel!
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 12; i++) {
    const hx = ((i + 0.5) / 12) * W;
    const hy = H * (0.37 + (i % 3) * 0.055);
    const rw = 22 + (i % 3) * 8;
    const rh = 11 + (i % 2) * 5;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-0.22 - (i % 3) * 0.08);
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 35, 255, 0.85)'; // High B channel = dark ink/smoke hollow in shader!
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';

  return configureTexture(c, true, true);
}

/**
 * 2. VARUNA — Ukiyo-e Hokusai Woodblock Wave & Clawed Seafoam Atlas (1024x512)
 * - R: Continuous flowing translucent water silk body + curled wave crest edge
 * - G: Carved parallel Hokusai woodblock striation lines sweeping along the curve
 * - B: Sculpted clawed white seafoam crests & curled foam fingers along the outer crest
 * - A: Crisp woodblock silhouette alpha
 */
function buildWaterWaveSheetTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = makeCanvas(W, H);
  if (!c) return new THREE.CanvasTexture(new ImageData(2, 2) as unknown as HTMLCanvasElement);
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  // Flowing Ukiyo-e wave sheet silhouette (R=255, G=120, B=0)
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const u = (x / W) * Math.PI * 2;
    const y = H * 0.24 + Math.sin(u * 2 + 0.3) * 26 + Math.sin(u * 5) * 11;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let x = W; x >= 0; x -= 8) {
    const u = (x / W) * Math.PI * 2;
    const y = H * 0.84 + Math.sin(u * 2 + 1.1) * 16 + Math.cos(u * 4) * 7;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 110, 0, 1.0)';
  ctx.fill();

  // Authentic Hokusai parallel carved woodblock wave striations (high/low G channel bands!)
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const stripeRows = 7;
  for (let s = 0; s < stripeRows; s++) {
    const baseY = H * (0.30 + (s / stripeRows) * 0.50);
    const isBright = s % 2 === 0;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const u = (x / W) * Math.PI * 2;
      const y = baseY + Math.sin(u * 2 + 0.3 + s * 0.22) * 20 + Math.sin(u * 6 - s * 0.7) * 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = isBright ? 14 : 9;
    ctx.strokeStyle = isBright ? 'rgba(255, 240, 20, 0.95)' : 'rgba(255, 22, 0, 0.92)';
    ctx.stroke();
  }
  ctx.restore();

  // Sculpted Hokusai clawed white seafoam crests erupting off the outer wave ridge (B=255!)
  const crestCount = 7;
  for (let i = 0; i < crestCount; i++) {
    const cx = ((i + 0.4) / crestCount) * W;
    const u = (cx / W) * Math.PI * 2;
    const cy = H * 0.24 + Math.sin(u * 2 + 0.3) * 26;

    const drawClawCluster = (ox: number) => {
      const bx = cx + ox;
      // Main frothy crest cushion
      ctx.beginPath();
      ctx.ellipse(bx, cy + 12, 48, 22, -0.14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
      ctx.fill();

      // 4 iconic Hokusai hooked foam claws curling backward off the crest
      for (let claw = 0; claw < 4; claw++) {
        const clX = bx - 30 + claw * 20;
        const clY = cy + 6 - (claw === 1 || claw === 2 ? 8 : 0);
        const clawH = 38 + (claw % 2) * 18;
        const hook = 22 + claw * 6;
        ctx.beginPath();
        ctx.moveTo(clX - 9, clY + 12);
        ctx.quadraticCurveTo(clX - hook * 0.6, clY - clawH * 0.85, clX - hook, clY - clawH);
        ctx.quadraticCurveTo(clX - hook * 0.1, clY - clawH * 0.55, clX + 8, clY + 10);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.fill();

        // Trailing cel-shaded spray bead right off the claw tip
        ctx.beginPath();
        ctx.arc(clX - hook - 8, clY - clawH - 6, 5.5 + (claw % 2) * 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.fill();
      }
    };

    drawClawCluster(0);
    if (cx < 90) drawClawCluster(W);
    if (cx > W - 90) drawClawCluster(-W);
  }

  return configureTexture(c, true, true);
}

/**
 * 3. VAYU — Sanemi Razor Emerald Wind-Blade & Pitch-Black Sumi-e Tear-Streak Atlas (1024x512)
 * - R: Multi-layered overlapping razor crescent wind-blades slicing parallel along the sweep
 * - G: Blinding ice-mint white cutting cores on each blade edge
 * - B: Pitch-black sumi-e ink tear-streaks slashing violently across the emerald wind
 * - A: Razor-sharp blade silhouette alpha
 */
function buildWindBladeSheetTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = makeCanvas(W, H);
  if (!c) return new THREE.CanvasTexture(new ImageData(2, 2) as unknown as HTMLCanvasElement);
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  // Paint 3 overlapping staggered razor wind-blade bands (instantly distinct silhouette!)
  const bands = [
    { top: 0.14, bot: 0.34, amp: 14, phase: 0.2, g: 165 },
    { top: 0.32, bot: 0.66, amp: 18, phase: 1.5, g: 220 },
    { top: 0.64, bot: 0.86, amp: 12, phase: 2.8, g: 150 },
  ];

  for (const b of bands) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const u = (x / W) * Math.PI * 2;
      const y = H * b.top + Math.sin(u * 3 + b.phase) * b.amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = W; x >= 0; x -= 8) {
      const u = (x / W) * Math.PI * 2;
      const y = H * b.bot + Math.sin(u * 3 + b.phase + 0.6) * (b.amp * 0.75);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(255, ${b.g}, 0, 1.0)`;
    ctx.fill();

    // Razor ice-mint cutting spine along upper edge of each wind blade (G=255)
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const u = (x / W) * Math.PI * 2;
      const y = H * (b.top + (b.bot - b.top) * 0.26) + Math.sin(u * 3 + b.phase) * b.amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(255, 255, 0, 1.0)';
    ctx.stroke();
  }

  // Aggressive angled razor wind-fangs shearing off outer and inner edges
  for (let i = 0; i < 12; i++) {
    const fx = ((i + 0.25) / 12) * W;
    const isTop = i % 2 === 0;
    const fy = isTop ? H * 0.16 : H * 0.84;
    const dir = isTop ? -1 : 1;
    const paintFang = (ox: number) => {
      const bx = fx + ox;
      ctx.beginPath();
      ctx.moveTo(bx + 26, fy - dir * 18);
      ctx.lineTo(bx - 56, fy + dir * 48);
      ctx.lineTo(bx - 6, fy - dir * 6);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 235, 0, 1.0)';
      ctx.fill();
    };
    paintFang(0);
    if (fx < 70) paintFang(W);
    if (fx > W - 40) paintFang(-W);
  }

  // Pitch-black sumi-e ink tear-streaks slashing violently through the emerald wind (B=255!)
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 16; i++) {
    const sx = ((i + 0.15) / 16) * W;
    const sy = H * (0.24 + (i % 4) * 0.16);
    const len = 78 + (i % 3) * 32;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - len, sy + (i % 2 === 0 ? 12 : -10));
    ctx.lineTo(sx - len * 0.55, sy + (i % 2 === 0 ? 4 : -3));
    ctx.closePath();
    ctx.fillStyle = 'rgba(200, 15, 255, 1.0)';
    ctx.fill();
  }
  ctx.restore();

  return configureTexture(c, true, true);
}

/**
 * 4. VAJRA — Zenitsu Angular Geometric Lightning Facet Sheet (1024x512)
 * - Zero soft blur: crisp polygonal lightning zigzag core + angular outer golden plasma + sharp electric spurs
 */
function buildLightningSheetTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = makeCanvas(W, H);
  if (!c) return new THREE.CanvasTexture(new ImageData(2, 2) as unknown as HTMLCanvasElement);
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  // Deterministic sawtooth-angular polyline across [0..W]
  const pts: Array<{ x: number; y: number }> = [];
  const segs = 16;
  for (let i = 0; i <= segs; i++) {
    const x = (i / segs) * W;
    const zig = i === 0 || i === segs ? 0 : (i % 2 === 0 ? 1 : -1) * (46 + ((i * 37) % 34));
    pts.push({ x, y: H * 0.5 + zig });
  }

  // Outer electric gold-cyan jagged shell (R=255, G=165, B=0)
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  ctx.beginPath();
  pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineWidth = 104;
  ctx.strokeStyle = 'rgba(255, 155, 0, 1.0)';
  ctx.stroke();

  // Sharp angular lightning spurs cracking off the elbows
  for (let i = 1; i < segs; i++) {
    const p = pts[i];
    const dir = i % 2 === 0 ? 1 : -1;
    const spurX = p.x - 42;
    const spurY = p.y + dir * 108;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 16, p.y + dir * 56);
    ctx.lineTo(spurX, spurY);
    ctx.lineWidth = 22;
    ctx.strokeStyle = 'rgba(255, 220, 0, 1.0)';
    ctx.stroke();

    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255, 255, 0, 1.0)';
    ctx.stroke();
  }

  // Blinding pure white-hot core spine (G=255)
  ctx.beginPath();
  pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineWidth = 34;
  ctx.strokeStyle = 'rgba(255, 255, 0, 1.0)';
  ctx.stroke();

  // Parallel crackling secondary micro-bolt inside the ribbon (B=255 -> electric cyan accent!)
  ctx.beginPath();
  pts.forEach((p, idx) => {
    const oy = (idx % 2 === 0 ? -1 : 1) * 34;
    if (idx === 0) ctx.moveTo(p.x, p.y + oy);
    else ctx.lineTo(p.x, p.y + oy);
  });
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(255, 195, 255, 1.0)';
  ctx.stroke();

  return configureTexture(c, true, true);
}

/**
 * 5. IMPACT & PARTICLE 2x2 SPRITE ATLAS (512x512)
 * - (0,0) Top-Left:  12-point asymmetric Manga Clash Starburst with black sumi-e ink outline
 * - (1,0) Top-Right: Ink-rimmed cel-shaded Teardrop Water Droplet
 * - (0,1) Bot-Left:  Razor-tapered Anime Speed-Spark Needle (replaces chunky flat sticks!)
 * - (1,1) Bot-Right: Angular Shattered Stone/Rock Shard with cel highlight + ink contour
 */
function buildImpactSpriteAtlasTexture(): THREE.CanvasTexture {
  const S = 512;
  const half = S / 2;
  const c = makeCanvas(S, S);
  if (!c) return new THREE.CanvasTexture(new ImageData(2, 2) as unknown as HTMLCanvasElement);
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);

  // Cell (0,0): 12-point asymmetric Manga Clash Starburst
  {
    const cx = half * 0.5;
    const cy = half * 0.5;
    const drawStar = (outerR: number, innerR: number, fill: string, stroke?: string, lw = 0) => {
      const spikes = 12;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const ang = (i / (spikes * 2)) * Math.PI * 2;
        const isOuter = i % 2 === 0;
        const asym = isOuter ? (i % 6 === 0 ? 1.18 : i % 4 === 0 ? 0.96 : 0.72) : 1.0;
        const r = (isOuter ? outerR : innerR) * asym;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke && lw > 0) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    };
    drawStar(104, 24, '#ffffff', '#0b0908', 8);
    drawStar(72, 14, '#ffffff');
  }

  // Cell (1,0): Cel-shaded Teardrop Water Droplet (ink rim + white specular)
  {
    const cx = half * 1.5;
    const cy = half * 0.52;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 82);
    ctx.bezierCurveTo(cx + 56, cy - 6, cx + 62, cy + 68, cx, cy + 74);
    ctx.bezierCurveTo(cx - 62, cy + 68, cx - 56, cy - 6, cx, cy - 82);
    ctx.closePath();
    ctx.fillStyle = '#e8fbff';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#071830';
    ctx.stroke();

    // Bright cel highlight crescent
    ctx.beginPath();
    ctx.ellipse(cx - 16, cy + 16, 12, 26, -0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // Cell (0,1): Razor-tapered Anime Speed-Spark Needle (horizontal orientation for velocity rotation)
  {
    const cx = half * 0.5;
    const cy = half * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 110, cy);
    ctx.quadraticCurveTo(cx - 10, cy - 26, cx + 112, cy);
    ctx.quadraticCurveTo(cx - 10, cy + 26, cx - 110, cy);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#120a06';
    ctx.stroke();
  }

  // Cell (1,1): Angular Shattered Rock / Wind Shard Polygon
  {
    const cx = half * 1.5;
    const cy = half * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 72, cy - 24);
    ctx.lineTo(cx - 12, cy - 84);
    ctx.lineTo(cx + 76, cy - 36);
    ctx.lineTo(cx + 58, cy + 56);
    ctx.lineTo(cx - 28, cy + 78);
    ctx.lineTo(cx - 82, cy + 28);
    ctx.closePath();
    ctx.fillStyle = '#d4d0c8';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#0c0a09';
    ctx.stroke();

    // Faceted dark-side cel plane
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 84);
    ctx.lineTo(cx + 76, cy - 36);
    ctx.lineTo(cx + 58, cy + 56);
    ctx.lineTo(cx + 4, cy + 8);
    ctx.closePath();
    ctx.fillStyle = '#6c6862';
    ctx.fill();
  }

  return configureTexture(c, false, false);
}

let cachedAtlas: PainterlyVfxAtlas | null = null;

export function getOrCreatePainterlyVfxAtlas(): PainterlyVfxAtlas {
  if (cachedAtlas) return cachedAtlas;
  const flameSheet = buildFlameSheetTexture();
  const waterWaveSheet = buildWaterWaveSheetTexture();
  const windBladeSheet = buildWindBladeSheetTexture();
  const lightningSheet = buildLightningSheetTexture();
  const impactSprites = buildImpactSpriteAtlasTexture();

  cachedAtlas = {
    flameSheet,
    waterWaveSheet,
    windBladeSheet,
    lightningSheet,
    impactSprites,
    dispose: () => {
      flameSheet.dispose();
      waterWaveSheet.dispose();
      windBladeSheet.dispose();
      lightningSheet.dispose();
      impactSprites.dispose();
      cachedAtlas = null;
    },
  };
  return cachedAtlas;
}

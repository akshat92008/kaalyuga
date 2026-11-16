/**
 * Renders Demon Slayer / Chola sandstone destructible pillars matching the cel-shaded
 * octagonal pillars from the Demon Slayer prototype (`#080509` Sumi-e ink outlines,
 * antique bronze collars, ember rune band, cracked fracture stage, and scattered rubble).
 */
export function renderDemonSlayerCholaPillar(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    destroyed: boolean;
    pillarStage: 0 | 1 | 2;
    hitFlashTimer: number;
    nowMs: number;
    bossEnraged?: boolean;
  }
) {
  const { x, y, destroyed, pillarStage, hitFlashTimer, nowMs, bossEnraged } = opts;

  ctx.save();
  ctx.translate(x, y);

  // Soft grounded Sumi-e contact shadow
  const shadowGrad = ctx.createRadialGradient(0, 6, 8, 0, 6, destroyed ? 58 : 74);
  shadowGrad.addColorStop(0, 'rgba(6, 4, 9, 0.84)');
  shadowGrad.addColorStop(0.55, 'rgba(6, 4, 9, 0.42)');
  shadowGrad.addColorStop(1, 'rgba(6, 4, 9, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 6, destroyed ? 58 : 74, destroyed ? 34 : 42, 0, 0, Math.PI * 2);
  ctx.fill();

  const inkStroke = '#080509';
  const pulse = 0.72 + Math.sin(nowMs * 0.008) * 0.28;

  if (destroyed) {
    // Crumbled octagonal temple stump + scattered Sumi-e outlined sandstone shards
    ctx.fillStyle = '#53453b';
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-40, 2);
    ctx.lineTo(-28, -16);
    ctx.lineTo(28, -16);
    ctx.lineTo(40, 2);
    ctx.lineTo(30, 18);
    ctx.lineTo(-30, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Jagged fractured top face
    ctx.fillStyle = '#746152';
    ctx.beginPath();
    ctx.moveTo(-26, -8);
    ctx.lineTo(-8, -18);
    ctx.lineTo(14, -12);
    ctx.lineTo(26, -6);
    ctx.lineTo(12, 6);
    ctx.lineTo(-16, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const shards: Array<[number, number, number, number]> = [
      [-46, 12, 16, -0.3],
      [44, 14, 14, 0.4],
      [-18, 28, 13, 0.2],
      [22, 26, 15, -0.5],
    ];
    for (const [sx, sy, sr, rot] of shards) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      ctx.fillStyle = '#665447';
      ctx.strokeStyle = inkStroke;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-sr, 2);
      ctx.lineTo(-sr * 0.4, -sr * 0.65);
      ctx.lineTo(sr * 0.8, -sr * 0.35);
      ctx.lineTo(sr, sr * 0.45);
      ctx.lineTo(-sr * 0.3, sr * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  const isFlash = hitFlashTimer > 0;
  const isCracked = pillarStage === 1;
  const shakeX = isCracked && hitFlashTimer > 0 ? Math.sin(nowMs * 0.08) * 3 : 0;
  ctx.translate(shakeX, 0);

  // 1. Stepped octagonal temple plinth (2 tiers: stone + antique bronze)
  ctx.lineJoin = 'round';
  ctx.fillStyle = isFlash ? '#fff1c4' : '#5b4c42';
  ctx.strokeStyle = inkStroke;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-46, 4);
  ctx.lineTo(-34, -14);
  ctx.lineTo(34, -14);
  ctx.lineTo(46, 4);
  ctx.lineTo(34, 20);
  ctx.lineTo(-34, 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bronze collar plinth
  ctx.fillStyle = isFlash ? '#ffe49e' : '#8d6c41';
  ctx.beginPath();
  ctx.moveTo(-36, -6);
  ctx.lineTo(-27, -20);
  ctx.lineTo(27, -20);
  ctx.lineTo(36, -6);
  ctx.lineTo(27, 6);
  ctx.lineTo(-27, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Cel-shaded 3-facet octagonal Chola sandstone shaft (light / mid / shadow planes!)
  const topY = -126;
  const botY = -14;

  // Left lit anime plane
  ctx.fillStyle = isFlash ? '#fff5d6' : '#8e7663';
  ctx.beginPath();
  ctx.moveTo(-28, botY);
  ctx.lineTo(-25, topY);
  ctx.lineTo(-10, topY - 4);
  ctx.lineTo(-11, botY + 3);
  ctx.closePath();
  ctx.fill();

  // Center daylight midtone facet
  ctx.fillStyle = isFlash ? '#ffedc2' : '#6d594b';
  ctx.beginPath();
  ctx.moveTo(-11, botY + 3);
  ctx.lineTo(-10, topY - 4);
  ctx.lineTo(12, topY - 4);
  ctx.lineTo(13, botY + 3);
  ctx.closePath();
  ctx.fill();

  // Right shadow cel facet
  ctx.fillStyle = isFlash ? '#ffe099' : '#43362f';
  ctx.beginPath();
  ctx.moveTo(13, botY + 3);
  ctx.lineTo(12, topY - 4);
  ctx.lineTo(25, topY);
  ctx.lineTo(28, botY);
  ctx.closePath();
  ctx.fill();

  // Bold Sumi-e ink outline & facet crease lines
  ctx.strokeStyle = inkStroke;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-28, botY);
  ctx.lineTo(-25, topY);
  ctx.lineTo(25, topY);
  ctx.lineTo(28, botY);
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, botY + 2);
  ctx.lineTo(-10, topY - 3);
  ctx.moveTo(13, botY + 2);
  ctx.lineTo(12, topY - 3);
  ctx.stroke();

  // Weathering stone strata bands
  ctx.strokeStyle = 'rgba(22, 16, 14, 0.55)';
  ctx.lineWidth = 1.8;
  for (const sy of [-40, -96]) {
    ctx.beginPath();
    ctx.moveTo(-26, sy);
    ctx.lineTo(26, sy);
    ctx.stroke();
  }

  // 3. Glowing Bull-Horn Fissure Rune Band (brightens & pulses crimson when boss enraged or cracked)
  const runeColor = isCracked
    ? `rgba(255, 58, 76, ${0.82 + 0.18 * pulse})`
    : bossEnraged
      ? `rgba(255, 78, 52, ${0.68 + 0.22 * pulse})`
      : `rgba(235, 118, 42, ${0.65 + 0.2 * pulse})`;
  ctx.fillStyle = runeColor;
  ctx.strokeStyle = inkStroke;
  ctx.lineWidth = 2.2;
  ctx.fillRect(-27, -74, 54, 12);
  ctx.strokeRect(-27, -74, 54, 12);

  // Etched bright center core line inside rune ring
  ctx.fillStyle = isCracked ? '#ffe0e6' : '#ffe29a';
  ctx.fillRect(-20, -70, 40, 3);

  // Cracked fractures when pillarStage === 1
  if (isCracked) {
    ctx.strokeStyle = '#ff2a44';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-16, -68);
    ctx.lineTo(-4, -92);
    ctx.lineTo(8, -112);
    ctx.moveTo(14, -66);
    ctx.lineTo(4, -44);
    ctx.lineTo(-9, -24);
    ctx.stroke();

    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-17, -69);
    ctx.lineTo(-5, -93);
    ctx.lineTo(7, -113);
    ctx.stroke();
  }

  // 4. Stepped Bronze Collar + Chola Mandapa Diamond Abacus Capital
  ctx.fillStyle = isFlash ? '#ffe49e' : '#957042';
  ctx.strokeStyle = inkStroke;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-34, topY + 2);
  ctx.lineTo(-26, topY - 12);
  ctx.lineTo(26, topY - 12);
  ctx.lineTo(34, topY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Flat sandstone abacus cap
  ctx.fillStyle = isFlash ? '#fff2cc' : '#786353';
  ctx.beginPath();
  ctx.moveTo(-42, topY - 12);
  ctx.lineTo(-32, topY - 26);
  ctx.lineTo(32, topY - 26);
  ctx.lineTo(42, topY - 12);
  ctx.lineTo(32, topY - 3);
  ctx.lineTo(-32, topY - 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top abacus cel highlight bevel
  ctx.fillStyle = '#a28770';
  ctx.beginPath();
  ctx.moveTo(-31, topY - 24);
  ctx.lineTo(31, topY - 24);
  ctx.lineTo(38, topY - 14);
  ctx.lineTo(-38, topY - 14);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

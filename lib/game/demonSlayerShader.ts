import * as THREE from 'three';

let sharedToonGradient: THREE.DataTexture | null = null;
let sharedEnemyDemonGradient: THREE.DataTexture | null = null;

export function getDemonSlayerToonGradient(): THREE.DataTexture {
  if (sharedToonGradient) return sharedToonGradient;
  // 3-band crisp 2D anime cel gradient: clean lit shadow -> warm mid-tone -> crisp anime highlight
  const ramp = new Uint8Array([146, 208, 255]);
  const tex = new THREE.DataTexture(ramp, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedToonGradient = tex;
  return tex;
}

/**
 * Deeper high-contrast 3-band ufotable Demon cel gradient (deep shadow -> rich mid -> crisp highlight)
 * so pale/dark enemy 3D models read with bold anime anatomy instead of washed-out clay flatness.
 */
export function getEnemyDemonToonGradient(): THREE.DataTexture {
  if (sharedEnemyDemonGradient) return sharedEnemyDemonGradient;
  // Unified bright 3-band anime cel ramp matching Rudra so enemies & bosses read crisply
  const ramp = new Uint8Array([146, 208, 255]);
  const tex = new THREE.DataTexture(ramp, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedEnemyDemonGradient = tex;
  return tex;
}

const liftedTextureCache = new WeakMap<object, THREE.Texture>();
const enemyGradedTextureCache = new WeakMap<object, THREE.Texture>();
const gammaLutCache = new Map<number, Float32Array>();

function getGammaLiftLut(brightnessLift: number): Float32Array {
  const key = Math.round(brightnessLift * 1000);
  let lut = gammaLutCache.get(key);
  if (!lut) {
    lut = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.pow(i / 255, 0.78) * brightnessLift;
    }
    gammaLutCache.set(key, lut);
  }
  return lut;
}

/**
 * Brightens AI textures into crisp, true-hue 2D anime pigments while preserving
 * dark Sumi-e crevices and preventing red/pomegranate channel blowout on skin and crimson cloth.
 */
export function liftTextureToAnimeVibrancy(
  tex: THREE.Texture | null,
  brightnessLift = 1.18,
  saturationBoost = 1.12
): THREE.Texture | null {
  if (!tex || typeof document === 'undefined') return tex;
  if (tex.userData?.animeLifted) return tex;

  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!img || !('width' in img) || !('height' in img) || img.width <= 0 || img.height <= 0) {
    return tex;
  }

  const cacheKey = (img as unknown as object) || tex;
  const cached = liftedTextureCache.get(cacheKey);
  if (cached) return cached;

  try {
    const w = Math.min(512, img.width);
    const h = Math.min(512, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return tex;

    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const lut = getGammaLiftLut(brightnessLift);

    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a === 0) continue;

      const rByte = d[i];
      const gByte = d[i + 1];
      const bByte = d[i + 2];

      const luma = (0.299 * rByte + 0.587 * gByte + 0.114 * bByte) / 255;

      // Preserve crisp Sumi-e black crevice ink lines, lift everything else cleanly
      if (luma < 0.07) {
        d[i] = Math.round(rByte * 0.72);
        d[i + 1] = Math.round(gByte * 0.70);
        d[i + 2] = Math.round(bByte * 0.74);
      } else {
        let r = lut[rByte];
        let g = lut[gByte];
        let b = lut[bByte];

        // Gentle saturation boost with extra restraint on red-heavy channels so skin & armor never turn pomegranate/wine
        const redDominance = Math.max(0, r - Math.max(g, b));
        const effSat = redDominance > 0.18 ? 1.0 + (saturationBoost - 1.0) * 0.45 : saturationBoost;
        const nl = 0.299 * r + 0.587 * g + 0.114 * b;
        r = nl + (r - nl) * effSat;
        g = nl + (g - nl) * effSat;
        b = nl + (b - nl) * effSat;

        d[i] = Math.max(0, Math.min(255, (r * 255 + 0.5) | 0));
        d[i + 1] = Math.max(0, Math.min(255, (g * 255 + 0.5) | 0));
        d[i + 2] = Math.max(0, Math.min(255, (b * 255 + 0.5) | 0));
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const out = new THREE.CanvasTexture(canvas);
    out.colorSpace = THREE.SRGBColorSpace;
    out.flipY = tex.flipY;
    out.wrapS = tex.wrapS;
    out.wrapT = tex.wrapT;
    out.userData = { ...tex.userData, animeLifted: true };
    out.needsUpdate = true;
    liftedTextureCache.set(cacheKey, out);
    return out;
  } catch {
    return tex;
  }
}

/**
 * Anti-chalk ufotable Demon pigment grader for regular enemies:
 * Anchors washed-out pale bone/ash textures into crisp mid-tones, deepens Sumi-e anatomical
 * crevices, and boosts rich cloth/armor saturation so enemies match Rudra's anime fidelity.
 */
export function gradeEnemyTextureToDemonAnime(
  tex: THREE.Texture | null,
  saturationBoost = 1.32
): THREE.Texture | null {
  if (!tex || typeof document === 'undefined') return tex;
  if (tex.userData?.demonAnimeGraded) return tex;

  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!img || !('width' in img) || !('height' in img) || img.width <= 0 || img.height <= 0) {
    return tex;
  }

  const cacheKey = (img as unknown as object) || tex;
  const cached = enemyGradedTextureCache.get(cacheKey);
  if (cached) return cached;

  try {
    const w = Math.min(512, img.width);
    const h = Math.min(512, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return tex;

    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;

      let r = d[i] / 255;
      let g = d[i + 1] / 255;
      let b = d[i + 2] / 255;
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const chroma = maxC - minC;

      // 1. Deepen Sumi-e anatomical & armor crevices into crisp indigo-ink shadow
      if (luma < 0.18) {
        r *= 0.56;
        g *= 0.52;
        b *= 0.64;
      } else {
        // 2. S-curve anime cel contrast + anti-chalk pull-down on bleached pale skin/ash
        let gradedLuma = 0.46 + (luma - 0.48) * 1.24;
        if (luma > 0.58 && chroma < 0.16) {
          // Pull chalky desaturated pale tones down into crisp cool anime demon slate/bone
          gradedLuma *= 0.84;
          b = Math.min(1, b * 1.05);
          r *= 0.96;
        }
        gradedLuma = Math.max(0.05, Math.min(0.94, gradedLuma));
        const lumaScale = gradedLuma / Math.max(0.001, luma);
        r *= lumaScale;
        g *= lumaScale;
        b *= lumaScale;

        // 3. Rich cel pigment saturation boost (makes crimson wraps, bronze, violet pop!)
        const nl = 0.299 * r + 0.587 * g + 0.114 * b;
        r = nl + (r - nl) * saturationBoost;
        g = nl + (g - nl) * saturationBoost;
        b = nl + (b - nl) * saturationBoost;
      }

      d[i] = Math.max(0, Math.min(255, (r * 255 + 0.5) | 0));
      d[i + 1] = Math.max(0, Math.min(255, (g * 255 + 0.5) | 0));
      d[i + 2] = Math.max(0, Math.min(255, (b * 255 + 0.5) | 0));
    }

    ctx.putImageData(imgData, 0, 0);
    const out = new THREE.CanvasTexture(canvas);
    out.colorSpace = THREE.SRGBColorSpace;
    out.flipY = tex.flipY;
    out.wrapS = tex.wrapS;
    out.wrapT = tex.wrapT;
    out.userData = { ...tex.userData, animeLifted: true, demonAnimeGraded: true };
    out.needsUpdate = true;
    enemyGradedTextureCache.set(cacheKey, out);
    return out;
  } catch {
    return tex;
  }
}

export interface CelMaterialOptions {
  normalMap?: THREE.Texture | null;
  normalScale?: THREE.Vector2;
  transparent?: boolean;
  opacity?: number;
  map: THREE.Texture | null;
  tintHex?: number;
  emissiveHex?: number;
  emissiveIntensity?: number;
  rimColorHex?: number;
  rimStrength?: number;
  rimPower?: number;
  underGlowColorHex?: number;
  underGlowStrength?: number;
  shadowTintHex?: number;
  shadowTintStrength?: number;
  useDemonContrastRamp?: boolean;
}

export interface CelShaderUniforms {
  uRimColor: { value: THREE.Color };
  uRimStrength: { value: number };
  uRimPower: { value: number };
  uFlashColor: { value: THREE.Color };
  uFlashMix: { value: number };
  uUnderGlowColor: { value: THREE.Color };
  uUnderGlowStrength: { value: number };
  uShadowTint: { value: THREE.Color };
  uShadowTintStrength: { value: number };
}

/**
 * Builds a clean 2D-anime cel-shaded material with crisp stepped lighting,
 * optional deep indigo/crimson demon shadow tinting, a sharp anime rim highlight,
 * and Akaza/Hinokami upward floor-mandala under-lighting.
 */
export function createDemonSlayerCelMaterial(
  opts: CelMaterialOptions
): THREE.MeshToonMaterial {
  const matOpts: THREE.MeshToonMaterialParameters = {
    normalMap: opts.normalMap ?? null,
    normalScale: opts.normalScale ?? new THREE.Vector2(1, 1),
    opacity: opts.opacity ?? 1,
    transparent: opts.transparent ?? false,
    color: opts.tintHex ?? 0xffffff,
    gradientMap: opts.useDemonContrastRamp
      ? getEnemyDemonToonGradient()
      : getDemonSlayerToonGradient(),
    emissive: new THREE.Color(opts.emissiveHex ?? 0x262220),
    emissiveIntensity: opts.emissiveIntensity ?? 0.24,
  };
  if (opts.map) {
    matOpts.map = opts.map;
    matOpts.emissiveMap = opts.map;
  }

  const mat = new THREE.MeshToonMaterial(matOpts);

  const celUniforms: CelShaderUniforms = {
    uRimColor: { value: new THREE.Color(opts.rimColorHex ?? 0xffe4b8) },
    uRimStrength: { value: opts.rimStrength ?? 0.28 },
    uRimPower: { value: opts.rimPower ?? 3.1 },
    uFlashColor: { value: new THREE.Color(0xfff1c4) },
    uFlashMix: { value: 0.0 },
    uUnderGlowColor: { value: new THREE.Color(opts.underGlowColorHex ?? 0x18d4ff) },
    uUnderGlowStrength: { value: opts.underGlowStrength ?? 0.0 },
    uShadowTint: { value: new THREE.Color(opts.shadowTintHex ?? 0x1d1229) },
    uShadowTintStrength: { value: opts.shadowTintStrength ?? 0.0 },
  };
  mat.userData.celUniforms = celUniforms;
  mat.userData.celHooked = true;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = celUniforms.uRimColor;
    shader.uniforms.uRimStrength = celUniforms.uRimStrength;
    shader.uniforms.uRimPower = celUniforms.uRimPower;
    shader.uniforms.uFlashColor = celUniforms.uFlashColor;
    shader.uniforms.uFlashMix = celUniforms.uFlashMix;
    shader.uniforms.uUnderGlowColor = celUniforms.uUnderGlowColor;
    shader.uniforms.uUnderGlowStrength = celUniforms.uUnderGlowStrength;
    shader.uniforms.uShadowTint = celUniforms.uShadowTint;
    shader.uniforms.uShadowTintStrength = celUniforms.uShadowTintStrength;

    shader.vertexShader =
      `varying vec3 vCelWorldNormal;\n` +
      shader.vertexShader.replace(
        '#include <defaultnormal_vertex>',
        `
        #include <defaultnormal_vertex>
        vCelWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
        `
      );

    shader.fragmentShader =
      `
      varying vec3 vCelWorldNormal;
      uniform vec3 uRimColor;
      uniform float uRimStrength;
      uniform float uRimPower;
      uniform vec3 uFlashColor;
      uniform float uFlashMix;
      uniform vec3 uUnderGlowColor;
      uniform float uUnderGlowStrength;
      uniform vec3 uShadowTint;
      uniform float uShadowTintStrength;
      ` +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        vec3 celViewDir = normalize(vViewPosition);
        float celNdotV = clamp(dot(normalize(vNormal), celViewDir), 0.0, 1.0);
        float celRimRaw = pow(1.0 - celNdotV, uRimPower);
        float celRimStep = smoothstep(0.50, 0.74, celRimRaw);
        // Deep ufotable indigo-plum shadow tint on dark bands so enemies never look muddy grey
        float celLuma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        float celShadowBand = 1.0 - smoothstep(0.24, 0.52, celLuma);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.62 + uShadowTint * 0.42, celShadowBand * uShadowTintStrength);
        // Akaza / Hinokami dramatic upward bounce light from glowing floor mandalas & flame rings
        float celUnderMask = smoothstep(0.28, -0.72, normalize(vCelWorldNormal).y);
        float celUnderBand = mix(celUnderMask * 0.45, 1.0, smoothstep(0.32, 0.62, celUnderMask));
        gl_FragColor.rgb = gl_FragColor.rgb * 1.04
          + uRimColor * celRimStep * uRimStrength
          + uUnderGlowColor * celUnderBand * uUnderGlowStrength * (0.48 + 0.52 * celRimStep);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFlashColor, clamp(uFlashMix * (0.45 + 0.55 * celRimStep), 0.0, 0.85));
        #include <dithering_fragment>
        `
      );
  };
  mat.customProgramCacheKey = () => 'demon-slayer-fresnel-toon-v6';
  return mat;
}

/**
 * Attaches an inverted-hull Sumi-e black ink outline sibling mesh to every Mesh or SkinnedMesh
 * inside `root`, deriving extrusion thickness directly from each geometry's own vertex-buffer
 * bounding height so Armature/cm/meter scale differences never inflate outlines into blobs.
 */
export function attachSumiInkOutlines(
  root: THREE.Object3D,
  outlineHeightRatio = 0.005,
  outlineColorHex = 0x080509
): THREE.Mesh[] {
  const targets: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && !obj.userData.isInkOutline && !obj.userData.hasInkOutline) {
      targets.push(obj as THREE.Mesh);
    }
  });

  const created: THREE.Mesh[] = [];
  for (const mesh of targets) {
    if (!mesh.parent || !mesh.geometry) continue;
    mesh.userData.hasInkOutline = true;
    if (!mesh.geometry.attributes.normal) {
      mesh.geometry.computeVertexNormals();
    }
    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }
    const bb = mesh.geometry.boundingBox!;
    const localSpan = Math.max(
      0.01,
      bb.max.y - bb.min.y,
      bb.max.x - bb.min.x,
      bb.max.z - bb.min.z
    );
    const localExtrude = Math.min(localSpan * 0.016, localSpan * outlineHeightRatio);
    const uExtrude = { value: localExtrude };

    const outlineMat = new THREE.MeshBasicMaterial({
      color: outlineColorHex,
      side: THREE.BackSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    outlineMat.onBeforeCompile = (shader) => {
      shader.uniforms.uExtrude = uExtrude;
      shader.vertexShader =
        `uniform float uExtrude;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          transformed += normalize(normal) * uExtrude;
          `
        );
    };
    outlineMat.customProgramCacheKey = () => 'sumi-outline-shared-basic-v1';

    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
      const skinnedSrc = mesh as THREE.SkinnedMesh;
      const outlineSkinned = new THREE.SkinnedMesh(skinnedSrc.geometry, outlineMat);
      outlineSkinned.bind(skinnedSrc.skeleton, skinnedSrc.bindMatrix);
      outlineSkinned.frustumCulled = false;
      outlineSkinned.castShadow = false;
      outlineSkinned.receiveShadow = false;
      outlineSkinned.userData.isInkOutline = true;
      mesh.parent.add(outlineSkinned);
      created.push(outlineSkinned);
    } else {
      const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
      outlineMesh.position.copy(mesh.position);
      outlineMesh.rotation.copy(mesh.rotation);
      outlineMesh.scale.copy(mesh.scale);
      outlineMesh.frustumCulled = false;
      outlineMesh.castShadow = false;
      outlineMesh.receiveShadow = false;
      outlineMesh.userData.isInkOutline = true;
      mesh.parent.add(outlineMesh);
      created.push(outlineMesh);
    }
  }

  return created;
}

export interface HierarchyCelStyleOptions {
  brightnessLift?: number;
  saturationBoost?: number;
  useDemonContrastRamp?: boolean;
  shadowTintHex?: number;
  shadowTintStrength?: number;
  rimColorHex?: number;
  rimStrength?: number;
  rimPower?: number;
  emissiveHex?: number;
  emissiveIntensity?: number;
  outlineHeightRatio?: number;
  outlineColorHex?: number;
  attachOutlines?: boolean;
}

/**
 * Upgrades every Mesh / SkinnedMesh in a 3D hierarchy to Demon Slayer 3-step MeshToonMaterial
 * while preserving diffuse textures and attaching inverted-hull Sumi-e BackSide ink outlines.
 */
export function applyDemonSlayerCelShadingToHierarchy(
  root: THREE.Object3D,
  opts: HierarchyCelStyleOptions = {}
): { celMaterials: THREE.MeshToonMaterial[]; outlineMeshes: THREE.Mesh[] } {
  const celMaterials: THREE.MeshToonMaterial[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.isInkOutline) return;

    const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const stdMat = srcMat as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined;
    const srcMap = stdMat && 'map' in stdMat ? stdMat.map ?? null : null;
    const lifted = liftTextureToAnimeVibrancy(srcMap, opts.brightnessLift, opts.saturationBoost);
    const tintHex =
      stdMat && 'color' in stdMat && stdMat.color && !lifted ? stdMat.color.getHex() : 0xffffff;

    const celMat = createDemonSlayerCelMaterial({
      map: lifted,
      useDemonContrastRamp: opts.useDemonContrastRamp,
      shadowTintHex: opts.shadowTintHex,
      shadowTintStrength: opts.shadowTintStrength,
      tintHex,
      emissiveHex: opts.emissiveHex ?? 0x262220,
      emissiveIntensity: opts.emissiveIntensity ?? 0.24,
      rimColorHex: opts.rimColorHex ?? 0xffe4b8,
      rimStrength: opts.rimStrength ?? 0.34,
      rimPower: opts.rimPower ?? 3.0,
    });
    mesh.material = celMat;
    mesh.frustumCulled = false;
    celMaterials.push(celMat);
  });

  const outlineMeshes =
    opts.attachOutlines === false
      ? []
      : attachSumiInkOutlines(
          root,
          opts.outlineHeightRatio ?? 0.0055,
          opts.outlineColorHex ?? 0x080509
        );

  return { celMaterials, outlineMeshes };
}

export function setCelRimStyle(
  materials: THREE.Material[],
  rimColorHex: number,
  rimStrength: number
) {
  for (const m of materials) {
    const u = m.userData?.celUniforms as CelShaderUniforms | undefined;
    if (u) {
      u.uRimColor.value.setHex(rimColorHex);
      u.uRimStrength.value = rimStrength;
    }
  }
}

export function setCelUnderGlow(
  materials: THREE.Material[],
  glowColorHex: number,
  glowStrength: number
) {
  for (const m of materials) {
    const u = m.userData?.celUniforms as CelShaderUniforms | undefined;
    if (u) {
      u.uUnderGlowColor.value.setHex(glowColorHex);
      u.uUnderGlowStrength.value = glowStrength;
    }
  }
}

export function setCelBounceTint(
  materials: THREE.Material[],
  tintColorHex: number,
  strength: number
) {
  setCelUnderGlow(materials, tintColorHex, strength);
}

export function setCelHitFlash(
  materials: THREE.Material[],
  isFlashing: boolean,
  baseEmissiveHex = 0x262220,
  baseEmissiveIntensity = 0.24,
  flashColorHex = 0xfff3d1
) {
  for (const m of materials) {
    const u = m.userData?.celUniforms as CelShaderUniforms | undefined;
    const emissiveMat = m as THREE.MeshStandardMaterial | THREE.MeshToonMaterial;
    if (isFlashing) {
      if ('emissive' in emissiveMat && emissiveMat.emissive) {
        emissiveMat.emissive.setHex(flashColorHex);
        emissiveMat.emissiveIntensity = 0.92;
      }
      if (u) {
        u.uFlashColor.value.setHex(flashColorHex);
        u.uFlashMix.value = 0.72;
      }
    } else {
      if ('emissive' in emissiveMat && emissiveMat.emissive) {
        emissiveMat.emissive.setHex(baseEmissiveHex);
        emissiveMat.emissiveIntensity = baseEmissiveIntensity;
      }
      if (u) {
        u.uFlashMix.value = 0.0;
      }
    }
  }
}

/**
 * Procedural Ufotable Hinokami flame aura material for Rudra's Parashu axe blade edge.
 * Kept crisp golden-amber with dark Sumi-e ink licks so it never turns Rudra into a red blob.
 */
export function createParashuAuraMaterial(colorHex = 0xff9f2e, intensity = 1): THREE.ShaderMaterial {
  const baseCol = new THREE.Color(colorHex);
  const outerCol = baseCol.clone().multiplyScalar(0.75);
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uColor: { value: baseCol },
      uIntensity: { value: intensity },
      uInnerColor: { value: new THREE.Color(0xfff6cc) },
      uMidColor: { value: baseCol },
      uOuterColor: { value: colorHex === 0xff9f2e ? new THREE.Color(0xe64d1c) : outerCol },
      uInkColor: { value: new THREE.Color(0x120806) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uInnerColor;
      uniform vec3 uMidColor;
      uniform vec3 uOuterColor;
      uniform vec3 uInkColor;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float dist = length(vec2(p.x * 0.92, p.y * 1.25));
        float wave = sin(p.x * 9.0 - uTime * 6.0) * 0.10 + cos(p.y * 7.0 + uTime * 5.0) * 0.07;
        float mask = 1.0 - smoothstep(0.32, 0.84, dist + wave);
        if (mask <= 0.08) discard;
        vec3 col = mix(uOuterColor, uMidColor, smoothstep(0.22, 0.58, mask));
        col = mix(col, uInnerColor, smoothstep(0.66, 0.92, mask));
        // Crisp dark Sumi-e ink edge around outer flame tongue
        float inkEdge = smoothstep(0.08, 0.18, mask) * (1.0 - smoothstep(0.18, 0.30, mask));
        col = mix(col, uInkColor, inkEdge * 0.75);
        gl_FragColor = vec4(col, clamp(mask * 0.48 * uIntensity, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Builds the 2 crossed anime flame sheath planes attached to Rudra's Parashu axe head.
 */
export function createParashuFlameSheathGroup(axeSpan: number): THREE.Group {
  const sheathGroup = new THREE.Group();
  sheathGroup.name = 'ParashuFlameSheath';
  const auraMat = createParashuAuraMaterial();
  const planeW = axeSpan * 0.52;
  const planeH = axeSpan * 0.34;
  const geo = new THREE.PlaneGeometry(planeW, planeH);

  const planeA = new THREE.Mesh(geo, auraMat);
  planeA.position.set(axeSpan * 0.34, 0, 0);
  planeA.frustumCulled = false;
  planeA.userData.isInkOutline = true;

  const planeB = new THREE.Mesh(geo, auraMat);
  planeB.position.set(axeSpan * 0.34, 0, 0);
  planeB.rotation.x = Math.PI * 0.5;
  planeB.frustumCulled = false;
  planeB.userData.isInkOutline = true;

  sheathGroup.add(planeA, planeB);
  return sheathGroup;
}



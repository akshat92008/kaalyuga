import * as THREE from 'three';

let sharedToonGradient: THREE.DataTexture | null = null;

/**
 * 3-step Demon Slayer cel-shading ramp:
 * Deep rich shadow plane (30%), true-color midtone (64%), crisp daylight plane (92%) — zero pure-white blowout.
 */
export function getDemonSlayerToonGradient(): THREE.DataTexture {
  if (sharedToonGradient) return sharedToonGradient;
  const stops = new Uint8Array([76, 164, 234]);
  const tex = new THREE.DataTexture(stops, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedToonGradient = tex;
  return tex;
}

/**
 * Grades Meshy PBR textures into vivid Demon Slayer anime color blocks while
 * protecting bright ash/bone areas from blowing out to flat #ffffff white and
 * keeping dark crevice ink lines deep so muscle definition and armor filigree pop.
 */
export function liftTextureToAnimeVibrancy(
  tex: THREE.Texture | null,
  brightnessLift = 1.04,
  saturationBoost = 1.32
): THREE.Texture | null {
  if (!tex || typeof document === 'undefined') return tex;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!img || !('width' in img) || !('height' in img) || img.width <= 0 || img.height <= 0) {
    return tex;
  }
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
    const safeLift = Math.min(1.08, Math.max(0.88, brightnessLift));
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      let r = d[i] / 255;
      let g = d[i + 1] / 255;
      let b = d[i + 2] / 255;
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      // Preserve deep Sumi-e black crevice ink lines
      if (luma < 0.08) {
        r *= 0.62;
        g *= 0.60;
        b *= 0.66;
      } else if (luma > 0.68) {
        // Highlight-safe shoulder compression so pale ash/bone textures keep anime shading instead of chalk #ffffff
        const compressed = 0.68 + (luma - 0.68) * 0.58;
        const ratio = compressed / Math.max(0.001, luma);
        r *= ratio;
        g *= ratio;
        b *= ratio;
        const nl = 0.299 * r + 0.587 * g + 0.114 * b;
        r = nl + (r - nl) * (saturationBoost * 1.08);
        g = nl + (g - nl) * (saturationBoost * 1.08);
        b = nl + (b - nl) * (saturationBoost * 1.08);
      } else {
        // Rich midtone anime pigment saturation without washing out shadows
        r = Math.pow(r, 0.92) * safeLift;
        g = Math.pow(g, 0.92) * safeLift;
        b = Math.pow(b, 0.92) * safeLift;
        const nl = 0.299 * r + 0.587 * g + 0.114 * b;
        r = nl + (r - nl) * saturationBoost;
        g = nl + (g - nl) * saturationBoost;
        b = nl + (b - nl) * saturationBoost;
      }
      d[i] = Math.max(0, Math.min(242, Math.round(r * 255)));
      d[i + 1] = Math.max(0, Math.min(240, Math.round(g * 255)));
      d[i + 2] = Math.max(0, Math.min(238, Math.round(b * 255)));
    }
    ctx.putImageData(imgData, 0, 0);
    const out = new THREE.CanvasTexture(canvas);
    out.colorSpace = THREE.SRGBColorSpace;
    out.flipY = tex.flipY;
    out.wrapS = tex.wrapS;
    out.wrapT = tex.wrapT;
    out.needsUpdate = true;
    return out;
  } catch {
    return tex;
  }
}

export interface CelMaterialOptions {
  map: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  normalScale?: THREE.Vector2;
  tintHex?: number;
  emissiveHex?: number;
  emissiveIntensity?: number;
  rimColorHex?: number;
  rimStrength?: number;
  rimPower?: number;
  opacity?: number;
  transparent?: boolean;
}

export interface CelShaderUniforms {
  uRimColor: { value: THREE.Color };
  uRimStrength: { value: number };
  uRimPower: { value: number };
  uFlashColor: { value: THREE.Color };
  uFlashMix: { value: number };
  uBounceColor: { value: THREE.Color };
  uBounceStrength: { value: number };
}

/**
 * Builds a calibrated Demon Slayer cel-shaded material with crisp stepped lighting,
 * cool/warm shadow preservation (zero white-out), hard Fresnel anime rim light,
 * and dynamic Blood Demon Art / Breathing Form bounce lighting.
 */
export function createDemonSlayerCelMaterial(
  opts: CelMaterialOptions
): THREE.MeshToonMaterial {
  const matOpts: THREE.MeshToonMaterialParameters = {
    color: opts.tintHex ?? 0xffffff,
    gradientMap: getDemonSlayerToonGradient(),
    emissive: new THREE.Color(opts.emissiveHex ?? 0x1a1118),
    emissiveIntensity: opts.emissiveIntensity ?? 0.08,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
  };
  if (opts.map) {
    matOpts.map = opts.map;
    matOpts.emissiveMap = opts.map;
  }
  if (opts.normalMap) {
    matOpts.normalMap = opts.normalMap;
    matOpts.normalScale = opts.normalScale ?? new THREE.Vector2(0.32, 0.32);
  }
  const mat = new THREE.MeshToonMaterial(matOpts);
  const celUniforms: CelShaderUniforms = {
    uRimColor: { value: new THREE.Color(opts.rimColorHex ?? 0xff9d3b) },
    uRimStrength: { value: opts.rimStrength ?? 0.56 },
    uRimPower: { value: opts.rimPower ?? 2.65 },
    uFlashColor: { value: new THREE.Color(0xffe49e) },
    uFlashMix: { value: 0.0 },
    uBounceColor: { value: new THREE.Color(0xff384c) },
    uBounceStrength: { value: 0.0 },
  };
  mat.userData.celUniforms = celUniforms;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = celUniforms.uRimColor;
    shader.uniforms.uRimStrength = celUniforms.uRimStrength;
    shader.uniforms.uRimPower = celUniforms.uRimPower;
    shader.uniforms.uFlashColor = celUniforms.uFlashColor;
    shader.uniforms.uFlashMix = celUniforms.uFlashMix;
    shader.uniforms.uBounceColor = celUniforms.uBounceColor;
    shader.uniforms.uBounceStrength = celUniforms.uBounceStrength;
    shader.fragmentShader =
      `
      uniform vec3 uRimColor;
      uniform float uRimStrength;
      uniform float uRimPower;
      uniform vec3 uFlashColor;
      uniform float uFlashMix;
      uniform vec3 uBounceColor;
      uniform float uBounceStrength;
      ` +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        vec3 celViewDir = normalize(vViewPosition);
        vec3 celN = normalize(vNormal);
        float celNdotV = clamp(dot(celN, celViewDir), 0.0, 1.0);
        float celRimRaw = pow(1.0 - celNdotV, uRimPower);
        float celRimStep = smoothstep(0.40, 0.62, celRimRaw);
        float lowerBounce = smoothstep(0.25, -0.55, celN.y);
        gl_FragColor.rgb += uRimColor * celRimStep * uRimStrength * 0.78;
        gl_FragColor.rgb += uBounceColor * (0.35 + 0.65 * lowerBounce) * celRimStep * uBounceStrength;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFlashColor, clamp(uFlashMix * (0.28 + 0.72 * celRimStep), 0.0, 0.48));
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(0.96, 0.95, 0.94));
        #include <dithering_fragment>
        `
      );
  };
  mat.customProgramCacheKey = () => 'demon-slayer-fresnel-toon-v3';
  return mat;
}

/**
 * Attaches an inverted-hull Sumi-e black ink outline sibling mesh to every Mesh or SkinnedMesh
 * inside `root`, deriving extrusion thickness directly from each geometry's own vertex-buffer
 * bounding height so Armature/cm/meter scale differences never inflate outlines into blobs.
 */
export function attachSumiInkOutlines(
  root: THREE.Object3D,
  outlineHeightRatio = 0.0044,
  outlineColorHex = 0x070409
): THREE.Mesh[] {
  const targets: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && !obj.userData.isInkOutline && !obj.userData.isAuraShell) {
      targets.push(obj as THREE.Mesh);
    }
  });
  const created: THREE.Mesh[] = [];
  for (const mesh of targets) {
    if (!mesh.parent || !mesh.geometry) continue;
    // Skip duplicate ink outlines if already attached to this mesh
    if (mesh.userData.hasSumiOutline) continue;
    mesh.userData.hasSumiOutline = true;

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
    const localExtrude = Math.min(localSpan * 0.014, localSpan * outlineHeightRatio);
    const outlineMat = new THREE.MeshBasicMaterial({
      color: outlineColorHex,
      side: THREE.BackSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    outlineMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        transformed += normalize(normal) * ${localExtrude.toFixed(6)};
        `
      );
    };
    outlineMat.customProgramCacheKey = () => `sumi-outline-v3-${localExtrude.toFixed(5)}`;
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

export interface DemonSlayerHierarchyStyleOptions {
  tintHex?: number;
  emissiveHex?: number;
  emissiveIntensity?: number;
  rimColorHex?: number;
  rimStrength?: number;
  rimPower?: number;
  brightnessLift?: number;
  saturationBoost?: number;
  outlineHeightRatio?: number;
  outlineColorHex?: number;
  attachOutlines?: boolean;
}

export interface DemonSlayerStyledResult {
  celMaterials: THREE.MeshToonMaterial[];
  outlineMeshes: THREE.Mesh[];
}

/**
 * Converts every non-outline Mesh/SkinnedMesh material inside `root` into a vibrant
 * Demon Slayer `MeshToonMaterial` with highlight-safe anime textures, stepped Fresnel rim-lighting,
 * and optional inverted-hull Sumi-e black ink outlines.
 */
export function applyDemonSlayerCelShadingToHierarchy(
  root: THREE.Object3D,
  options: DemonSlayerHierarchyStyleOptions = {}
): DemonSlayerStyledResult {
  const celMaterials: THREE.MeshToonMaterial[] = [];
  const upgradedMapCache = new WeakMap<THREE.Material, THREE.MeshToonMaterial>();
  const liftedTexCache = new WeakMap<THREE.Texture, THREE.Texture | null>();

  const getLiftedTex = (srcTex: THREE.Texture | null | undefined): THREE.Texture | null => {
    if (!srcTex) return null;
    if (liftedTexCache.has(srcTex)) return liftedTexCache.get(srcTex)!;
    const lifted = liftTextureToAnimeVibrancy(
      srcTex,
      options.brightnessLift ?? 1.04,
      options.saturationBoost ?? 1.32
    );
    liftedTexCache.set(srcTex, lifted);
    return lifted;
  };

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    if (child.userData.isInkOutline || child.userData.isAuraShell) return;
    const mesh = child as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const nextMats = mats.map((m) => {
      if (!m) return m;
      if (upgradedMapCache.has(m)) {
        return upgradedMapCache.get(m)!;
      }
      if ((m as THREE.MeshToonMaterial).isMeshToonMaterial && m.userData.celUniforms) {
        celMaterials.push(m as THREE.MeshToonMaterial);
        return m;
      }
      const std = m as THREE.MeshStandardMaterial;
      const srcMap = 'map' in std ? std.map : null;
      const srcNormal = 'normalMap' in std ? std.normalMap : null;
      const srcColorHex =
        options.tintHex ??
        ('color' in std && std.color ? std.color.getHex() : 0xffffff);
      const liftedMap = getLiftedTex(srcMap);
      const toonMat = createDemonSlayerCelMaterial({
        map: liftedMap,
        normalMap: srcNormal ?? null,
        normalScale: std.normalScale,
        tintHex: srcColorHex,
        emissiveHex: options.emissiveHex ?? 0x1a1118,
        emissiveIntensity: options.emissiveIntensity ?? 0.08,
        rimColorHex: options.rimColorHex ?? 0xff9d3b,
        rimStrength: options.rimStrength ?? 0.56,
        rimPower: options.rimPower ?? 2.65,
      });
      upgradedMapCache.set(m, toonMat);
      celMaterials.push(toonMat);
      return toonMat;
    });
    mesh.material = Array.isArray(mesh.material) ? nextMats : nextMats[0];
  });

  const outlineMeshes =
    options.attachOutlines !== false
      ? attachSumiInkOutlines(
          root,
          options.outlineHeightRatio ?? 0.0044,
          options.outlineColorHex ?? 0x070409
        )
      : [];

  return { celMaterials, outlineMeshes };
}

export function setCelRimStyle(
  materials: THREE.MeshToonMaterial[],
  rimColorHex: number,
  rimStrength: number
) {
  for (const m of materials) {
    const u = m.userData.celUniforms as CelShaderUniforms | undefined;
    if (u) {
      u.uRimColor.value.setHex(rimColorHex);
      u.uRimStrength.value = Math.min(0.85, rimStrength);
    }
  }
}

export function setCelBounceTint(
  materials: THREE.MeshToonMaterial[],
  bounceColorHex: number,
  bounceStrength: number
) {
  for (const m of materials) {
    const u = m.userData.celUniforms as CelShaderUniforms | undefined;
    if (u) {
      u.uBounceColor.value.setHex(bounceColorHex);
      u.uBounceStrength.value = Math.max(0, Math.min(0.85, bounceStrength));
    }
  }
}

export function setCelHitFlash(
  materials: THREE.MeshToonMaterial[],
  isFlashing: boolean,
  baseEmissiveHex = 0x1a1118,
  baseEmissiveIntensity = 0.08,
  flashColorHex = 0xffe49e
) {
  for (const m of materials) {
    const u = m.userData.celUniforms as CelShaderUniforms | undefined;
    if (isFlashing) {
      m.emissive.setHex(flashColorHex);
      m.emissiveIntensity = 0.28;
      if (u) {
        u.uFlashColor.value.setHex(flashColorHex);
        u.uFlashMix.value = 0.44;
      }
    } else {
      m.emissive.setHex(baseEmissiveHex);
      m.emissiveIntensity = baseEmissiveIntensity;
      if (u) {
        u.uFlashMix.value = 0.0;
      }
    }
  }
}

/**
 * Animated elemental energy shader for weapon aura shells (Rudra's Parashu axe & Boss weapons).
 */
export function createParashuAuraMaterial(
  colorHex = 0xff6a22,
  phaseSpeed = 1.35
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
      uIntensity: { value: 0.92 },
      uSpeed: { value: phaseSpeed },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform float uTime;
      uniform float uSpeed;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec3 p = position + normalize(normal) * (0.015 + 0.006 * sin(uTime * 6.0 * uSpeed + position.y * 8.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vViewPos = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uSpeed;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vViewPos);
        float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 1.8);
        float flame = noise(vec2(vUv.x * 6.0, vUv.y * 10.0 - uTime * 3.8 * uSpeed));
        float band = smoothstep(0.32, 0.72, flame * 0.65 + rim * 0.75);
        float alpha = band * rim * uIntensity * 0.72;
        if (alpha < 0.04) discard;
        vec3 col = mix(uColor, vec3(1.0, 0.96, 0.86), rim * 0.48);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  });
}

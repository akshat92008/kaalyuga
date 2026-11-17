import * as THREE from 'three';

let sharedToonGradient: THREE.DataTexture | null = null;

/**
 * 4-step Demon Slayer / Hinokami Chronicles cel-shading ramp:
 * Warm anime shadow floor (58%), rich midtone (82%), crisp lit plane (96%), and specular highlight step (100%).
 */
export function getDemonSlayerToonGradient(): THREE.DataTexture {
  if (sharedToonGradient) return sharedToonGradient;
  const stops = new Uint8Array([152, 214, 248]);
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
 * lifting dark AI-baked ambient occlusion shadows into vibrant hand-painted pigments
 * and preserving crisp dark crevice ink lines.
 */
export function liftTextureToAnimeVibrancy(
  tex: THREE.Texture | null,
  brightnessLift = 1.18,
  saturationBoost = 1.45
): THREE.Texture | null {
  if (!tex || typeof document === 'undefined') return tex;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!img || !('width' in img) || !('height' in img) || img.width <= 0 || img.height <= 0) {
    return tex;
  }
  try {
    const w = Math.min(256, img.width);
    const h = Math.min(256, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return tex;
    const bPct = Math.round(Math.min(1.35, Math.max(0.95, brightnessLift)) * 100);
    const sPct = Math.round(Math.min(1.65, Math.max(1.0, saturationBoost)) * 100);
    ctx.filter = `brightness(${bPct}%) saturate(${sPct}%) contrast(112%)`;
    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    ctx.filter = 'none';
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
 * Builds a Guilty Gear Strive / Demon Slayer: Hinokami Chronicles cel-painted material:
 * - GPU-side Anime Albedo Posterization & Shadow Lift (works 100% even when textures stream async!)
 * - Non-black Half-Lambert 3-band anime cel lighting (shadows never crush to pitch black)
 * - Internal Fresnel Sumi-e contour ink linework + razor-sharp stepped elemental rim light
 */
export function createDemonSlayerCelMaterial(
  opts: CelMaterialOptions
): THREE.MeshToonMaterial {
  const matOpts: THREE.MeshToonMaterialParameters = {
    color: opts.tintHex ?? 0xffffff,
    gradientMap: getDemonSlayerToonGradient(),
    emissive: new THREE.Color(opts.emissiveHex ?? 0x0d0907),
    emissiveIntensity: opts.emissiveIntensity ?? 0.06,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
  };
  if (opts.map) {
    matOpts.map = opts.map;
    matOpts.emissiveMap = opts.map;
  }
  if (opts.normalMap) {
    matOpts.normalMap = opts.normalMap;
    matOpts.normalScale = opts.normalScale ?? new THREE.Vector2(0.28, 0.28);
  }
  const mat = new THREE.MeshToonMaterial(matOpts);
  const celUniforms: CelShaderUniforms = {
    uRimColor: { value: new THREE.Color(opts.rimColorHex ?? 0xff9d3b) },
    uRimStrength: { value: opts.rimStrength ?? 0.72 },
    uRimPower: { value: opts.rimPower ?? 2.35 },
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

    // 1. GPU Anime Albedo Contrast & Chroma Boost right after #include <map_fragment>
    // Operates in perceptual sRGB space so dark armor/hair/ink stay deep while midtone pigments pop!
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      {
        vec3 rawLinear = max(diffuseColor.rgb, vec3(0.015, 0.012, 0.012));
        vec3 srgbAlb = pow(rawLinear, vec3(1.0 / 2.2));
        vec3 liftedSrgb = pow(srgbAlb, vec3(0.84)) * 1.14;
        float albLuma = dot(liftedSrgb, vec3(0.299, 0.587, 0.114));
        vec3 satSrgb = mix(vec3(albLuma), liftedSrgb, 1.48);
        float posterLuma = floor(albLuma * 6.0 + 0.5) / 6.0;
        float targetLuma = mix(albLuma, posterLuma, 0.28);
        satSrgb *= targetLuma / max(0.001, albLuma);
        satSrgb = clamp(satSrgb, vec3(0.04, 0.035, 0.03), vec3(0.96, 0.94, 0.90));
        diffuseColor.rgb = pow(satSrgb, vec3(2.2));
      }
      `
    );

    // 2. Ufotable / Hinokami Chronicles 3-Step Anime Cel Ramp + Crisp Terminator + Fresnel Rim + Contour Ink
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

        // Convert linear diffuseColor.rgb into sRGB to match post-colorspace gl_FragColor.rgb
        vec3 baseSrgb = pow(clamp(diffuseColor.rgb, vec3(0.001), vec3(1.0)), vec3(1.0 / 2.2));

        // Overhead-front anime key-light direction in view space for crisp 3-band cel shading
        vec3 animeKeyDir = normalize(vec3(-0.42, 0.68, 0.60));
        float halfLambert = dot(celN, animeKeyDir) * 0.5 + 0.5;
        float celBand1 = smoothstep(0.42, 0.45, halfLambert);
        float celBand2 = smoothstep(0.72, 0.75, halfLambert);

        // True-hue anime shadow plane (46%) -> vibrant midtone (102%) -> sunlit highlight plane (120%)
        vec3 shadowTint = baseSrgb * vec3(0.46, 0.44, 0.42);
        vec3 midTint = baseSrgb * 1.02;
        vec3 highTint = min(vec3(0.96, 0.94, 0.90), baseSrgb * 1.20 + vec3(0.035, 0.025, 0.015));
        vec3 animeCelLit = mix(shadowTint, midTint, celBand1);
        animeCelLit = mix(animeCelLit, highTint, celBand2);

        gl_FragColor.rgb = mix(gl_FragColor.rgb, animeCelLit, 0.82);

        // Stepped Fresnel anime rim light + strict grazing lower-body bounce rim (never washes midtones!)
        float celRimRaw = pow(1.0 - celNdotV, uRimPower);
        float celRimStep = smoothstep(0.42, 0.58, celRimRaw);
        float lowerBounce = smoothstep(0.15, -0.55, celN.y);
        gl_FragColor.rgb += uRimColor * celRimStep * uRimStrength * 0.78;
        gl_FragColor.rgb += uBounceColor * lowerBounce * celRimStep * uBounceStrength * 0.42;

        // Crisp dark Sumi-e grazing contour ink edge at silhouette grazing angles
        float silhouetteInk = 1.0 - smoothstep(0.12, 0.22, celNdotV);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.02, 0.015, 0.015), silhouetteInk * 0.76);

        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFlashColor, clamp(uFlashMix * (0.32 + 0.68 * celRimStep), 0.0, 0.54));
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(0.96, 0.95, 0.92));
        #include <dithering_fragment>
        `
      );
  };
  mat.customProgramCacheKey = () => 'demon-slayer-fresnel-toon-v7';
  return mat;
}

/**
 * Attaches an inverted-hull Sumi-e black ink outline sibling mesh to every Mesh or SkinnedMesh
 * inside `root`, deriving extrusion thickness directly from each geometry's own vertex-buffer
 * bounding height so Armature/cm/meter scale differences never inflate outlines into blobs.
 */
export function attachSumiInkOutlines(
  root: THREE.Object3D,
  outlineHeightRatio = 0.0072,
  outlineColorHex = 0x060208
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
    if (mesh.userData.hasSumiOutline) continue;
    mesh.userData.hasSumiOutline = true;

    if (mesh.geometry.attributes.color) {
      mesh.geometry.deleteAttribute('color');
    }
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
    const localExtrude = Math.min(localSpan * 0.018, localSpan * outlineHeightRatio);
    const outlineMat = new THREE.MeshBasicMaterial({
      color: outlineColorHex,
      side: THREE.BackSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const uExtrude = { value: localExtrude };
    outlineMat.userData.uExtrude = uExtrude;
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
    outlineMat.customProgramCacheKey = () => 'sumi-outline-v6-shared';
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
 * stripped dark vertex colors, smooth normals, and inverted-hull Sumi-e black ink outlines.
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
    const img = srcTex.image as { width?: number; height?: number } | undefined;
    const isLoaded = Boolean(img && typeof img.width === 'number' && img.width > 0);
    const lifted = liftTextureToAnimeVibrancy(
      srcTex,
      options.brightnessLift ?? 1.18,
      options.saturationBoost ?? 1.45
    );
    if (isLoaded) {
      liftedTexCache.set(srcTex, lifted);
    }
    return lifted;
  };

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    if (child.userData.isInkOutline || child.userData.isAuraShell) return;
    const mesh = child as THREE.Mesh;
    // Strip dark Meshy FBX vertex colors & ensure normals exist
    if (mesh.geometry) {
      if (mesh.geometry.attributes.color) {
        mesh.geometry.deleteAttribute('color');
      }
      if (!mesh.geometry.attributes.normal) {
        mesh.geometry.computeVertexNormals();
      }
    }
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
        emissiveHex: options.emissiveHex ?? 0x0d0907,
        emissiveIntensity: options.emissiveIntensity ?? 0.06,
        rimColorHex: options.rimColorHex ?? 0xff9d3b,
        rimStrength: options.rimStrength ?? 0.72,
        rimPower: options.rimPower ?? 2.35,
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
          options.outlineHeightRatio ?? 0.0072,
          options.outlineColorHex ?? 0x060208
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
      u.uRimStrength.value = Math.min(0.95, rimStrength);
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
      u.uBounceStrength.value = Math.max(0, Math.min(0.92, bounceStrength));
    }
  }
}

export function setCelHitFlash(
  materials: THREE.MeshToonMaterial[],
  isFlashing: boolean,
  baseEmissiveHex = 0x0d0907,
  baseEmissiveIntensity = 0.05,
  flashColorHex = 0xffe49e
) {
  for (const m of materials) {
    const u = m.userData.celUniforms as CelShaderUniforms | undefined;
    if (isFlashing) {
      m.emissive.setHex(flashColorHex);
      m.emissiveIntensity = 0.34;
      if (u) {
        u.uFlashColor.value.setHex(flashColorHex);
        u.uFlashMix.value = 0.48;
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
      uIntensity: { value: 0.96 },
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
        vec3 p = position + normalize(normal) * (0.018 + 0.008 * sin(uTime * 6.0 * uSpeed + position.y * 8.0));
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
        float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 1.65);
        float flame = noise(vec2(vUv.x * 6.0, vUv.y * 10.0 - uTime * 3.8 * uSpeed));
        float band = smoothstep(0.28, 0.68, flame * 0.65 + rim * 0.78);
        float alpha = band * rim * uIntensity * 0.82;
        if (alpha < 0.04) discard;
        vec3 col = mix(uColor, vec3(1.0, 0.97, 0.88), rim * 0.55);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  });
}

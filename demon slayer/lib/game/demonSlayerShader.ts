import * as THREE from 'three';

let sharedToonGradient: THREE.DataTexture | null = null;

export function getDemonSlayerToonGradient(): THREE.DataTexture {
  if (sharedToonGradient) return sharedToonGradient;
  // 4-step Ufotable cel shading gradient: rich shadow -> warm mid -> bright lit -> specular snap
  const ramp = new Uint8Array([92, 168, 232, 255]);
  const tex = new THREE.DataTexture(ramp, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedToonGradient = tex;
  return tex;
}

/**
 * Brightens muddy AI-generated textures while preserving dark ink crevices
 * and boosting crimson/bronze/crimson-garment vibrancy for Demon Slayer readability.
 */
export function liftTextureToAnimeVibrancy(
  tex: THREE.Texture | null,
  brightnessLift = 1.28,
  saturationBoost = 1.32
): THREE.Texture | null {
  if (!tex || typeof document === 'undefined') return tex;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!img || !('width' in img) || !('height' in img) || img.width <= 0 || img.height <= 0) {
    return tex;
  }

  try {
    const w = Math.min(1024, img.width);
    const h = Math.min(1024, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return tex;

    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a === 0) continue;

      let r = d[i] / 255;
      let g = d[i + 1] / 255;
      let b = d[i + 2] / 255;

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      // Preserve deep Sumi-e black crevice ink lines, lift everything else crisply
      if (luma < 0.08) {
        r *= 0.72;
        g *= 0.70;
        b *= 0.74;
      } else {
        // Gamma lift pulls dark armor/skin clearly out of dark stone floor
        r = Math.pow(r, 0.76) * brightnessLift;
        g = Math.pow(g, 0.76) * brightnessLift;
        b = Math.pow(b, 0.76) * brightnessLift;

        const nl = 0.299 * r + 0.587 * g + 0.114 * b;
        r = nl + (r - nl) * saturationBoost;
        g = nl + (g - nl) * saturationBoost;
        b = nl + (b - nl) * saturationBoost;
      }

      d[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
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
  tintHex?: number;
  emissiveHex?: number;
  emissiveIntensity?: number;
}

/**
 * Builds a luminous Demon Slayer cel-shaded material that uses the character's
 * brightened diffuse map for crisp stepped lighting and self-lit shadow warmth.
 */
export function createDemonSlayerCelMaterial(
  opts: CelMaterialOptions
): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color: opts.tintHex ?? 0xffffff,
    map: opts.map ?? undefined,
    gradientMap: getDemonSlayerToonGradient(),
    emissive: new THREE.Color(opts.emissiveHex ?? 0x2d1d17),
    emissiveMap: opts.map ?? undefined,
    emissiveIntensity: opts.emissiveIntensity ?? 0.34,
  });
  return mat;
}

/**
 * Attaches an inverted-hull Sumi-e black ink outline sibling mesh to every Mesh or SkinnedMesh
 * inside `root`, deriving extrusion thickness directly from each geometry's own vertex-buffer
 * bounding height so Armature/cm/meter scale differences never inflate outlines into blobs.
 */
export function attachSumiInkOutlines(
  root: THREE.Object3D,
  outlineHeightRatio = 0.007,
  outlineColorHex = 0x080509
): THREE.Mesh[] {
  const targets: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && !obj.userData.isInkOutline) {
      targets.push(obj as THREE.Mesh);
    }
  });

  const created: THREE.Mesh[] = [];
  for (const mesh of targets) {
    if (!mesh.parent || !mesh.geometry) continue;
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
    const localExtrude = Math.min(localSpan * 0.02, localSpan * outlineHeightRatio);

    const outlineMat = new THREE.MeshToonMaterial({
      color: 0x000000,
      emissive: new THREE.Color(outlineColorHex),
      emissiveIntensity: 1.0,
      side: THREE.BackSide,
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
    outlineMat.customProgramCacheKey = () => `sumi-outline-${localExtrude.toFixed(5)}`;

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

export function setCelHitFlash(
  materials: THREE.MeshToonMaterial[],
  isFlashing: boolean,
  baseEmissiveHex = 0x2d1d17,
  baseEmissiveIntensity = 0.34,
  flashColorHex = 0xfff3d1
) {
  for (const m of materials) {
    if (isFlashing) {
      m.emissive.setHex(flashColorHex);
      m.emissiveIntensity = 1.65;
    } else {
      m.emissive.setHex(baseEmissiveHex);
      m.emissiveIntensity = baseEmissiveIntensity;
    }
  }
}

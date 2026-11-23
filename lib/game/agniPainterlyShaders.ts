// The same UV convention is used for the swept weapon path and the cast:
// u runs along the stroke, v=1 is its cutting edge.
export const AGNI_PAINTERLY_GLSL = /* glsl */ `
  vec4 paintAgni(float u, float v) {
    float taper = smoothstep(0.0, 0.15, u) * (1.0 - smoothstep(0.84, 1.0, u));
    float drift = uLife * 0.52;
    float broad = noise2(vec2(u * 7.0 - drift, v * 4.0));
    float grain = noise2(vec2(u * 24.0 - drift * 2.5, v * 9.0));
    float wear = smoothstep(uLife * 0.85 - 0.22, uLife * 0.85 + 0.09,
      0.26 + u * 0.39 + broad * 0.37);
    float life = (1.0 - smoothstep(0.55, 1.0, uLife)) * wear * taper * uOpacity;
    float edge = 0.78 + 0.095 * sin(u * 25.16 - uLife * 13.26 - v * 4.6 + broad * 1.65);

    if (uAgniPass > 2.5) {
      float distanceToEdge = abs(v - edge);
      float filament = 1.0 - smoothstep(0.016, 0.065, distanceToEdge);
      float shoulder = 1.0 - smoothstep(0.035, 0.115, distanceToEdge);
      float peak = 1.0 - smoothstep(0.30, 0.85, uLife);
      float alpha = (filament * 0.76 + shoulder * 0.24) * life * (0.25 + 0.75 * peak);
      vec3 color = mix(uMidColor, uCoreColor * 1.35, filament);
      return vec4(color * alpha, alpha);
    }

    if (uAgniPass > 1.5) {
      float spread = 1.0 - clamp(abs(v - 0.71) / 0.5, 0.0, 1.0);
      float border = smoothstep(0.0, 0.16, v) * (1.0 - smoothstep(0.87, 1.0, v));
      float alpha = spread * spread * life * border * 0.48;
      return vec4(uEdgeColor * alpha, alpha);
    }

    vec2 warped = vec2(u * uUvRepeat - drift * 0.62 + (broad - 0.5) * 0.14,
      clamp(1.06 - v + (broad - 0.5) * 0.17 + (grain - 0.5) * 0.09, 0.0, 1.0));
    vec4 brush = vec4(1.0, broad, 0.0, smoothstep(0.14, 0.43, v));
    if (uUseAtlas > 0.5) brush = texture2D(uAtlasTex, warped);
    // Broad vermilion mass, overlapping hooked tongues, and a hot inner fold.
    // The atlas adds grain while the connected silhouette is drawn here.
    float stream = u * 7.4 - uLife * 3.9;
    float curl = sin(stream * 3.4 - v * 6.2 + broad * 1.65);
    float lower = 0.12 + broad * 0.08 + 0.036 * curl;
    float upper = 0.74 + 0.18 * curl + (grain - 0.5) * 0.08;
    float coat = smoothstep(lower - 0.04, lower + 0.09, v)
      * (1.0 - smoothstep(upper - 0.02, upper + 0.055, v));
    float tongue = smoothstep(0.24, 0.71, brush.a + curl * 0.15);
    float drawnTongue = tongue * smoothstep(0.55, 0.79, v) * (1.0 - smoothstep(0.88, 1.0, v));
    float alpha = max(coat * (0.84 + tongue * 0.16), drawnTongue * 0.70) * life;
    float foldedLine = 0.48 + curl * 0.11 + (broad - 0.5) * 0.12;
    float hotFold = 1.0 - smoothstep(0.016, 0.15, abs(v - foldedLine));
    hotFold *= smoothstep(0.22, 0.71, brush.g * 0.55 + broad * 0.65);
    float soot = smoothstep(0.54, 0.78, broad + grain * 0.12)
      * smoothstep(0.02, 0.18, v) * (1.0 - smoothstep(0.35, 0.58, v))
      * taper * uOpacity * smoothstep(0.22, 0.59, uLife)
      * (1.0 - smoothstep(0.62, 1.0, uLife));
    vec3 flame = mix(uDeepColor, uEdgeColor * 1.22, smoothstep(0.12, 0.48, v + brush.g * 0.17));
    flame = mix(flame, uMidColor * 1.38, hotFold);
    flame = mix(flame, uCoreColor, hotFold * hotFold * 0.72);
    return vec4(flame * alpha + vec3(0.09, 0.045, 0.039) * soot * (1.0 - alpha),
      alpha + soot * (1.0 - alpha));
  }
`;

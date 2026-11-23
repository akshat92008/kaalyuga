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
    float edge = 0.88 + (broad - 0.5) * 0.05;

    if (uAgniPass > 2.5) {
      float distanceToEdge = abs(v - edge);
      float filament = 1.0 - smoothstep(0.016, 0.065, distanceToEdge);
      float shoulder = 1.0 - smoothstep(0.035, 0.115, distanceToEdge);
      float alpha = (filament * 0.82 + shoulder * 0.18) * life;
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
    float belly = smoothstep(0.08, 0.23, v) * (1.0 - smoothstep(0.83, 0.98, v));
    float tongue = smoothstep(0.15, 0.71, brush.a - (1.0 - brush.g) * grain * 0.27);
    float alpha = tongue * belly * life;
    float smoke = smoothstep(0.49, 0.74, broad + grain * 0.14)
      * smoothstep(0.03, 0.18, v) * (1.0 - smoothstep(0.41, 0.69, v))
      * (1.0 - tongue * 0.83) * taper * uOpacity
      * smoothstep(0.03, 0.31, uLife) * (1.0 - smoothstep(0.62, 1.0, uLife));
    vec3 flame = mix(uDeepColor, uEdgeColor, smoothstep(0.14, 0.49, brush.g));
    flame = mix(flame, uMidColor * 1.22, smoothstep(0.40, 0.90, brush.g + v * 0.22));
    return vec4(flame * alpha + vec3(0.10, 0.056, 0.045) * smoke * (1.0 - alpha),
      alpha + smoke * (1.0 - alpha));
  }
`;

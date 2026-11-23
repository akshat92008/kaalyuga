// u follows the stroke, v crosses the stroke from its inner to its outer edge.
export const ELEMENTAL_CREST_GLSL = /* glsl */ `
  float brushBand(float v, float line, float width) {
    return 1.0 - smoothstep(width * 0.52, width, abs(v - line));
  }

  vec4 paintElementalCrest(float u, float v) {
    float head = smoothstep(-0.10, 0.33, uLife) * 1.20;
    float reveal = 1.0 - smoothstep(head - 0.10, head, u);
    float flow = u * 8.0 - uLife * 4.0;
    float broad = noise2(vec2(flow, 2.0 + v * 2.2));
    float grain = noise2(vec2(flow * 3.5, v * 11.0));
    float curl = sin(flow * 2.4 + broad * 2.0);
    float wear = 1.0 - smoothstep(0.57, 1.0, uLife);
    float tail = smoothstep(0.0, 0.13, u);
    float cuts = smoothstep(-0.10, 0.16, u + 0.28 * grain - 1.14 * uLife + 0.42);

    float outer = 0.83 + 0.09 * curl + (grain - 0.5) * 0.09;
    float inner = 0.12 + 0.09 * broad;
    vec3 col = uDeepColor;
    if (uCrestStyle < 1.5) {
      // Offset foam curls expose a continuous blue sheet beneath the crest.
      float muzzle = 1.0 - smoothstep(0.79, 0.98, u);
      outer = mix(outer, 0.79 + 0.11 * sin(u * 35.0), 1.0 - muzzle);
      float foam = brushBand(v, outer - 0.06, 0.10 + 0.06 * broad);
      float fold = brushBand(v, 0.40 + 0.18 * curl, 0.035 + 0.055 * broad);
      float facet = smoothstep(0.23, 0.70, v + (broad - 0.5) * 0.23);
      col = mix(col, uEdgeColor * 1.18, facet);
      col = mix(col, uMidColor * 1.02, fold * 0.56);
      col = mix(col, uInkColor, brushBand(v, outer - 0.18, 0.035) * 0.80);
      col = mix(col, uCoreColor * 1.12, foam);
      float eye = 1.0 - smoothstep(0.33, 1.0, length((vec2(u, v) - vec2(0.89, 0.59)) * vec2(48.0, 12.0)));
      col = mix(col, uInkColor, eye);
    } else if (uCrestStyle < 2.5) {
      // One cutting lip contains the pressure lines. The inside breaks into dry-brush gaps.
      outer = 0.91 + (broad - 0.5) * 0.12;
      inner = 0.22 + 0.22 * curl + 0.15 * grain;
      float edge = brushBand(v, outer - 0.09, 0.085);
      float threads = brushBand(v, 0.45 + 0.12 * curl, 0.034) * smoothstep(0.30, 0.67, broad);
      col = mix(col, uEdgeColor * 1.33, smoothstep(0.25, 0.72, v));
      col = mix(col, uMidColor, threads * 0.68);
      col = mix(col, mix(uMidColor, uCoreColor, 0.61), edge);
    } else {
      // A translucent spectral blade with a fractured inner edge.
      inner = 0.28 + 0.18 * broad;
      outer = 0.89 + (grain - 0.5) * 0.07;
      float spine = brushBand(v, outer - 0.075, 0.076);
      float veins = brushBand(v, 0.61 + curl * 0.12, 0.035) * smoothstep(0.28, 0.66, grain);
      col = mix(col, uEdgeColor * 1.27, smoothstep(0.37, 0.84, v));
      col = mix(col, uMidColor, veins);
      col = mix(col, uCoreColor, spine);
    }
    float coverage = smoothstep(inner - 0.07, inner + 0.07, v)
      * (1.0 - smoothstep(outer, outer + 0.055, v));
    float alpha = coverage * reveal * tail * cuts * wear * uOpacity;
    return vec4(col * alpha, alpha);
  }
`;

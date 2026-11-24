// u follows the stroke, v crosses the stroke from its inner to its outer edge.
export const ELEMENTAL_CREST_GLSL = /* glsl */ `
  float brushBand(float v, float line, float width) {
    return 1.0 - smoothstep(width * 0.52, width, abs(v - line));
  }

  // The mesh fixes the sweep path. Shading moves the leading edge and thins the
  // wake without tearing the stroke's silhouette into separate shapes.
  vec4 paintOpenStrike(float u, float v) {
    float head = 0.36 + 0.75 * smoothstep(0.0, 0.33, uLife);
    float localAge = max(0.0, uLife - u * 0.24);
    float life = (1.0 - smoothstep(0.40, 0.84, localAge))
      * (1.0 - smoothstep(head - 0.16, head, u));
    float taper = smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(0.91, 1.0, u));
    float flow = u * 7.2 - uLife * 3.4;
    float grain = noise2(vec2(flow, v * 4.4));
    float fine = noise2(vec2(flow * 2.4, v * 7.5));
    float isWater = step(0.5, uMode) * (1.0 - step(1.5, uMode));
    float isThunder = step(1.5, uMode) * (1.0 - step(2.5, uMode));
    float isWind = step(2.5, uMode);
    float waterLace = isWater * (fine - 0.5) * 0.08;
    float outer = 0.89 + (grain - 0.5) * 0.07 + waterLace;
    float inner = 0.13 + (grain - 0.5) * 0.14 + 0.22 * smoothstep(0.18, 0.76, localAge)
      + isWind * 0.15 + isThunder * 0.08;
    float body = smoothstep(inner - 0.02, inner + 0.13, v)
      * (1.0 - smoothstep(outer, outer + 0.07, v));
    float lip = brushBand(v, outer - 0.08, 0.12 - 0.043 * isThunder);
    float foam = isWater * brushBand(v, outer - 0.15 + waterLace, 0.08)
      * smoothstep(0.26, 0.72, fine);
    float fold = brushBand(v, 0.57 + 0.09 * sin(flow * 2.1 + grain), 0.11);
    float hotEdge = lip * (0.42 + 0.58 * smoothstep(0.28, 0.83, u))
      * (1.0 - smoothstep(0.24, 0.85, localAge));
    vec3 ink = mix(uDeepColor, uEdgeColor, smoothstep(0.20, 0.64, v));
    vec3 col = mix(ink, uMidColor, clamp(lip * 0.75 + fold * fine * 0.35, 0.0, 1.0));
    col = mix(col, uCoreColor, clamp(hotEdge * 0.85 + foam * 0.50, 0.0, 1.0));
    float alpha = life * taper * body * uOpacity * mix(1.0, 0.56 + 0.44 * lip, isWind);
    return vec4(col * alpha, alpha);
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
      float rollPhase = u * 23.0 - uLife * 19.0;
      float spindrift = smoothstep(0.24, 0.77, sin(rollPhase + grain * 2.7) * 0.42 + broad * 0.8);
      float foamClaws = smoothstep(0.18, 0.78, grain * 0.62 + curl * 0.27 + 0.26);
      float foam = brushBand(v, outer - 0.06, 0.065 + 0.085 * foamClaws);
      foam *= 0.26 + foamClaws * 0.74;
      float fold = brushBand(v, 0.40 + 0.18 * curl, 0.035 + 0.055 * broad);
      float facet = smoothstep(0.23, 0.70, v + (broad - 0.5) * 0.23);
      col = mix(col, uEdgeColor * 1.18, facet);
      col = mix(col, uMidColor * 1.02, fold * 0.56);
      col = mix(col, uInkColor, brushBand(v, outer - 0.18, 0.035) * 0.80);
      col = mix(col, uMidColor, brushBand(v, outer - 0.045, 0.09) * 0.60);
      float innerFoam = brushBand(v, outer - 0.19 - 0.09 * sin(rollPhase), 0.045 + 0.040 * broad);
      col = mix(col, uCoreColor * 1.12, max(foam * (0.43 + spindrift * 0.57), innerFoam * spindrift * 0.80));
      float eye = 1.0 - smoothstep(0.33, 1.0, length((vec2(u, v) - vec2(0.89, 0.59)) * vec2(48.0, 12.0)));
      col = mix(col, uInkColor, eye);
    } else if (uCrestStyle < 2.5) {
      // Keep the outside continuous as veils of wind move through the sheet.
      outer = 0.92 + (broad - 0.5) * 0.05;
      inner = 0.12 + 0.08 * curl + 0.13 * broad + 0.10 * uLife;
      float edge = brushBand(v, outer - 0.07, 0.13);
      float fold = brushBand(v, 0.56 + 0.10 * curl, 0.18) * smoothstep(0.15, 0.78, broad);
      col = mix(col, uEdgeColor * 1.38, smoothstep(0.19, 0.84, v));
      float pressure = exp(-abs(u - head + 0.16) * 7.0);
      col = mix(col, uMidColor, fold * 0.56 + edge * 0.39);
      col = mix(col, uCoreColor, edge * (0.26 + 0.16 * broad + 0.40 * pressure));
      float sheet = smoothstep(inner, inner + 0.21, v) * (1.0 - smoothstep(outer, outer + 0.07, v));
      float breath = 1.0 - smoothstep(0.32, 0.94, uLife);
      float alpha = sheet * reveal * tail * breath * uOpacity;
      return vec4(col * alpha, alpha);
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

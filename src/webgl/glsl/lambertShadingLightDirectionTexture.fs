#include <packing>
varying vec2 vUv;
uniform sampler2D tNormal;
uniform sampler2D tLightDirection;

#define ALBEDO vec3(1.) // Light gray

vec3 getUnpackedLightDirection(sampler2D lightDirectionTexture) {
  vec3 unpackedLightDir = unpackRGBToNormal(texture2D(lightDirectionTexture, vUv).xyz);
  return normalize(unpackedLightDir);
}

void main() {
  vec3 packedNormal = texture2D(tNormal, vUv).xyz;
  vec3 normal = unpackRGBToNormal(packedNormal);
  vec3 lightDirection = getUnpackedLightDirection(tLightDirection);
  if(packedNormal == vec3(0., 0., 0.)) {
    gl_FragColor.rgb = vec3(0., 0., 1.) * 0.8 + vec3(1.) * 0.5;
  } else {
    gl_FragColor.rgb = ALBEDO * max(dot(normal, lightDirection), 0.0);
  }
  gl_FragColor.a = 1.0;
}
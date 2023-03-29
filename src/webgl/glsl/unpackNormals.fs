#include <packing>

varying vec2 vUv;
uniform sampler2D tNormal;

void main() {
  vec3 packedNormal = texture2D(tNormal, vUv).xyz;
  vec3 normal = unpackRGBToNormal(packedNormal);
  gl_FragColor.rgb = normal;
  gl_FragColor.a = 1.0;
}
#include <packing>

varying vec2 vUv;
uniform sampler2D tNormal;
uniform vec3 lightDirection;

#define ALBEDO vec3(1.) // White

void main() {
  vec3 packedNormal = texture2D(tNormal, vUv).xyz;
  vec3 normal = unpackRGBToNormal(packedNormal);
  vec3 lightViewSpace = normalize((viewMatrix * vec4(lightDirection, 1.)).xyz);
  if(packedNormal == vec3(0., 0., 0.)) {
    gl_FragColor.rgb = vec3(0., 0., 1.) * 0.8 + vec3(1.) * 0.5;
  } else {
    gl_FragColor.rgb = ALBEDO * max(dot(normal, lightViewSpace), 0.0);
  }
  gl_FragColor.a = 1.0;
}
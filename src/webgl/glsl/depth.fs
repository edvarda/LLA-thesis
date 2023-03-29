#include <packing>

varying vec2 vUv;
uniform sampler2D tDepth;
uniform float near;
uniform float far;

//orto depth. Change when going back to ortho camera
float readDepth(sampler2D depthSampler, vec2 coord) {
  float fragCoordZ = texture2D(depthSampler, coord).x;
  float viewZ = perspectiveDepthToViewZ(fragCoordZ, near, far);
  return viewZToOrthographicDepth(viewZ, near, far);
}

void main() {
  float depth = readDepth(tDepth, vUv);

  gl_FragColor.rgb = 1.0 - vec3(depth);
  gl_FragColor.a = 1.0;
}
#include <packing>

varying vec2 vUv;
uniform highp sampler2DArray tDiffuseArray;
uniform int layer;

void main() {
  gl_FragColor.rgb = texture2D(tDiffuseArray, vec3(vUv.x, vUv.y, 0)).rgb;
  gl_FragColor.a = 1.0;
}
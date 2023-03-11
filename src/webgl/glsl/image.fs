#include <packing>

varying vec2 vUv;
uniform highp sampler2D tDiffuse;

void main() {
  gl_FragColor.rgb = texture2D(tDiffuse, vUv).rgb;
  gl_FragColor.a = 1.0;
}
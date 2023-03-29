#include <packing>

in vec3 normalV;
void main() {
  gl_FragColor.xyz = packNormalToRGB(normalize(normalV));
  gl_FragColor.a = 1.;
}
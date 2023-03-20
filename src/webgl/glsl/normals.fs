#include <packing>

in vec3 normalV;
void main() {
  gl_FragColor = vec4(vec3(normalV), 1.);
}
out vec3 normalV;

void main() {
  normalV = normalMatrix * normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
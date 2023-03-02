varying vec2 vUv;
uniform vec3 lightDirection;
out vec4 lightDir;

void main() {
  vUv = uv;
  lightDir = projectionMatrix * modelViewMatrix * vec4(lightDirection, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
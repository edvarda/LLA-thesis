varying vec2 vUv;
uniform vec3 lightDirection;
out vec3 lightDir;

void main() {
  vUv = uv;
  vec4 transformedLight = viewMatrix * vec4(lightDirection, 1.);
  lightDir = transformedLight.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
varying vec2 vUv;
uniform sampler2D tNormal;
uniform sampler2D tLightDirection;

#define ALBEDO vec3(0.8) // Light gray

void main() {
  vec3 normal = texture2D(tNormal, vUv).xyz;
  vec3 lightDirection = texture2D(tLightDirection, vUv).xyz;
  gl_FragColor.rgb = ALBEDO * max(dot(normal, lightDirection), 0.0);
  gl_FragColor.a = 1.0;
}
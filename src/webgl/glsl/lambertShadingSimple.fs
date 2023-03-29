varying vec2 vUv;
uniform sampler2D tNormal;
uniform vec3 lightDirection;

#define ALBEDO vec3(0.8) // Light gray

void main() {
  vec3 normal = texture2D(tNormal, vUv).xyz;
  vec3 lightViewSpace = normalize(viewMatrix * vec4(lightDirection, 1.)).xyz;
  gl_FragColor.rgb = ALBEDO * max(dot(normal, lightViewSpace), 0.0);
  gl_FragColor.a = 1.0;
}
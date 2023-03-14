// Local Light Alignment for Multi-Scale Shape Depiction - Eurographics 2021
// (C) Nolan Mestres, Romain Vergne, Camille Noûs, Joëlle Thollot
// https://hal.inria.fr/hal-03140647

///////////////////////////////////////////////////////////////////////////////!
// IMAGE BUFFER; OUTPUT: FINAL COLOR; /////////////////////////////////////////!
///////////////////////////////////////////////////////////////////////////////!

// INPUTS 

uniform highp sampler2D scale0;
uniform highp sampler2D scale1;
uniform highp sampler2D scale2;
uniform highp sampler2D scale3;
uniform highp sampler2D scale4;

uniform highp float sigma[4];

uniform highp float epsilon;
uniform highp float gamma;
varying vec2 vUv;
in vec3 lightDir;

#define SPEC false
#define DIFF true

// #define DIST    texture(iChannel2, PXL).w // Distance? Är detta tänkt att vara djup?

#define HALFPI    1.57079632679

#define ALBEDO vec3(0.8) // Light gray
#define BACKGROUNDCOLOR vec3(0.4,0.,0.) //Dark red

#define BLUE vec3(0.0,0.0,1.0) 
#define RED vec3(1.0,0.0,0.0) 
#define GREEN vec3(0.0,1.0,0.0) 
#define PURP vec3(1.0,0.0,1.0)

//////////////////////////!
// LOCAL LIGHT ALIGNMENT /!
//////////////////////////!

vec3 rotateLight(in vec3 l, in vec3 a, in float theta) {
  if(theta < epsilon)
    return l;

  vec3 axl = normalize(cross(a, l));
  float adl = dot(a, l);

  return a * adl + cos(theta) * cross(axl, a) + sin(theta) * axl;
}

// remap function to weight the rotation (solve discontinuities)
// lambda = lambda_1 * lambda_2
float W(in float lambda) {
  return lambda / (exp(-gamma) * (1. - lambda) + lambda);
}

// local frame L, constructed from n_i and n_{i+1}
mat3 L(in vec3 ni, in vec3 ni1) {
  vec3 z = ni1;
    // project n_i onto the plane of normal n_{i+1}
  vec3 x = normalize(ni - z * (dot(z, ni)));
  vec3 y = cross(x, z);

  return mat3(x, y, z);
}

// // vec3 adjustLight(in vec3 ni, in vec3 ni1, in vec3 li, in vec3 v, in float si, in bool spec) {
// vec3 adjustLight(in vec3 ni, in vec3 ni1, in vec3 li, in float si) {
//   if(si < epsilon) // no need to compute the adjustment at that scale...
//     return RED;

//   // if(spec) { // for specular materials we use the reflected view as guide
//   //   ni = reflect(v, ni);
//   //   ni1 = reflect(v, ni1);
//   // }

//   // if(1. - abs(dot(ni, ni1)) < epsilon) {// if the detail and base are already aligned...
//   //   return BLUE;
//   // }

//   mat3 Li = L(ni, ni1); // local frame L_i
//     // vectors to local frame
//   li = li * Li;	// in GLSL: v * M <=> M^T * v
//   vec3 gi = ni * Li;	// guiding vector
//   // vec3 gi = ni;	// guiding vector
//   // return Li * li;

//   vec3 x = normalize(ni - ni1 * (dot(ni1, ni)));

//     // if the light is not facing the detail, we align with the tangent
//   // if(li.x < 0.) // equivalent to the dot product check from the paper
//   if(dot(normalize(li), x) >= 0.) // equivalent to the dot product check from the paper
//   {
//     gi = vec3(-gi.z, gi.y, gi.x);
//     // return GREEN;
//   }

//   vec2 gp = normalize(gi.xy);
//   vec2 lp = normalize(li.xy);
//   float tha = acos(dot(lp, gp));    // azimuthal angle
//   // float lmbd1 = 1. - min(1., tha / HALFPI); // confidence value lambda_1
//   // float lmbd2 = length((ni * Li).xy);   // confidence value lambda_2

//   // float theta = si * W(lmbd1 * lmbd2) * acos(dot(li, gi));
//   float theta = si * acos(dot(li, gi));
//   vec3 a = normalize(cross(li, gi));	 // rotation axis a

//   // return PURP;
//   return Li * rotateLight(li, a, theta); // we return the rotated light direction
//   // return rotateLight(li, a, theta); // we return the rotated light direction
// }

vec3 adjustLight(in vec3 ni, in vec3 ni1, in vec3 li, in float si) {
  if(si < epsilon) // no need to compute the adjustment at that scale...
    return li;

  ni = normalize(ni);
  ni1 = normalize(ni1);

  if(1. - abs(dot(ni, ni1)) < epsilon) // if the detail and base are
    return li;                        // already aligned...

  mat3 Li = L(ni, ni1); // local frame L_i
    // vectors to local frame
  li = li * Li;	// in GLSL: v * M <=> M^T * v
  vec3 gi = ni * Li;	// guiding vector

    // if the light is not facing the detail, we align with the tangent
  if(li.x < 0.) // equivalent to the dot product check from the paper
    gi = vec3(-gi.z, gi.y, gi.x);

  vec2 gp = normalize(gi.xy);
  vec2 lp = normalize(li.xy);
  float tha = acos(dot(lp, gp));    // azimuthal angle
  float lmbd1 = 1. - min(1., tha / 1.57079632679); // confidence value lambda_1
  float lmbd2 = length((ni * Li).xy);   // confidence value lambda_2

  float theta = si * W(lmbd1 * lmbd2) * acos(dot(li, gi));
  vec3 a = normalize(cross(li, gi));	 // rotation axis a

  return Li * normalize(rotateLight(li, a, theta)); // we return the rotated light direction
}

void main() {
  vec3 lightDirection = normalize(lightDir);

  vec3 n_0 = texture(scale0, vUv).xyz;
  vec3 n_1 = texture(scale1, vUv).xyz;
  vec3 n_2 = texture(scale2, vUv).xyz;
  vec3 n_3 = texture(scale3, vUv).xyz;
  vec3 n_4 = texture(scale4, vUv).xyz;

  vec3 adjustedLightDirection;

  adjustedLightDirection = adjustLight(n_3, n_4, lightDirection, sigma[3]);
  adjustedLightDirection = adjustLight(n_2, n_3, adjustedLightDirection, sigma[2]);
  adjustedLightDirection = adjustLight(n_1, n_2, adjustedLightDirection, sigma[1]);
  adjustedLightDirection = adjustLight(n_0, n_1, adjustedLightDirection, sigma[0]);

  vec3 col = ALBEDO * max(dot(n_0, adjustedLightDirection), 0.0);
  gl_FragColor = vec4(col, 1.);
}
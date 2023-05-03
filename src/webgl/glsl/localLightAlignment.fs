// Local Light Alignment for Multi-Scale Shape Depiction - Eurographics 2021
// (C) Nolan Mestres, Romain Vergne, Camille Noûs, Joëlle Thollot
// https://hal.inria.fr/hal-03140647

///////////////////////////////////////////////////////////////////////////////!
// IMAGE BUFFER; OUTPUT: FINAL COLOR; /////////////////////////////////////////!
///////////////////////////////////////////////////////////////////////////////!

// INPUTS 
#include <packing>

uniform sampler2D scale0;
uniform sampler2D scale1;
uniform sampler2D scale2;
uniform sampler2D scale3;
uniform sampler2D scale4;
uniform sampler2D scale5;
uniform sampler2D scale6;

uniform float sigma[6];

uniform float epsilon;
uniform float gamma;
varying vec2 vUv;
uniform vec3 lightDirection;

#define HALFPI 1.57079632679489661923

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

vec3 adjustLight(in vec3 ni, in vec3 ni1, in vec3 li, in float si) {
  if(si < epsilon) // no need to compute the adjustment at that scale...
    return li;

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
  float lmbd1 = 1. - min(1., tha / HALFPI); // confidence value lambda_1
  float lmbd2 = length((ni * Li).xy);   // confidence value lambda_2

  float theta = si * W(lmbd1 * lmbd2) * acos(dot(li, gi));
  vec3 a = normalize(cross(li, gi));	 // rotation axis a

  vec3 rotatedLight = Li * rotateLight(li, a, theta);
  return normalize(rotatedLight); // we return the rotated light direction
}

vec3 getUnpackedNormal(sampler2D scaleTexture) {
  return normalize(unpackRGBToNormal(texture(scaleTexture, vUv).xyz));
}

void main() {
  vec3 lightDirection = normalize((viewMatrix * vec4(lightDirection, 1.)).xyz);

  vec3 n_0 = getUnpackedNormal(scale0);
  vec3 n_1 = getUnpackedNormal(scale1);
  vec3 n_2 = getUnpackedNormal(scale2);
  vec3 n_3 = getUnpackedNormal(scale3);
  vec3 n_4 = getUnpackedNormal(scale4);
  vec3 n_5 = getUnpackedNormal(scale5);
  vec3 n_6 = getUnpackedNormal(scale6);

  vec3 adjustedLightDirection;

  adjustedLightDirection = adjustLight(n_5, n_6, lightDirection, sigma[5]);
  adjustedLightDirection = adjustLight(n_4, n_5, adjustedLightDirection, sigma[4]);
  adjustedLightDirection = adjustLight(n_3, n_4, adjustedLightDirection, sigma[3]);
  adjustedLightDirection = adjustLight(n_2, n_3, adjustedLightDirection, sigma[2]);
  adjustedLightDirection = adjustLight(n_1, n_2, adjustedLightDirection, sigma[1]);
  adjustedLightDirection = adjustLight(n_0, n_1, adjustedLightDirection, sigma[0]);

  gl_FragColor.rgb = packNormalToRGB(adjustedLightDirection);
  gl_FragColor.a = 1.;
}
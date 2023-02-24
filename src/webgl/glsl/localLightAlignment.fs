// Local Light Alignment for Multi-Scale Shape Depiction - Eurographics 2021
// (C) Nolan Mestres, Romain Vergne, Camille Noûs, Joëlle Thollot
// https://hal.inria.fr/hal-03140647

///////////////////////////////////////////////////////////////////////////////!
// IMAGE BUFFER; OUTPUT: FINAL COLOR; /////////////////////////////////////////!
///////////////////////////////////////////////////////////////////////////////!

// INPUTS 

uniform vec3 lightDirection;
uniform highp sampler2D tScaleFine;
uniform highp sampler2D tScaleCoarse;
uniform float sigma;
uniform float epsilon;
uniform float gamma;
varying vec2 vUv;

#define SPEC false
#define DIFF true

// #define DIST    texture(iChannel2, PXL).w // Distance? Är detta tänkt att vara djup?

#define HALFPI    1.57079632679

#define ALBEDO vec3(0.8,0.8,0) // Light gray
#define BACKGROUNDCOLOR vec3(0.4,0.,0.) //Dark red

#define BLUE vec3(0.0,0.0,1.0) 
#define RED vec3(1.0,0.0,0.0) 
#define GREEN vec3(0.0,1.0,0.0) 
#define PURP vec3(1.0,0.0,1.0)

#define LIGHT vec3(0.,1.,0.)

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

// vec3 adjustLight(in vec3 ni, in vec3 ni1, in vec3 li, in vec3 v, in float si, in bool spec) {
vec3 adjustLight(in vec3 ni, in vec3 ni1, in vec3 li, in float si) {
  if(si < epsilon) // no need to compute the adjustment at that scale...
    return RED;

  // if(spec) { // for specular materials we use the reflected view as guide
  //   ni = reflect(v, ni);
  //   ni1 = reflect(v, ni1);
  // }

  // if(1. - abs(dot(ni, ni1)) < epsilon) {// if the detail and base are already aligned...
  //   return BLUE;
  // }

  mat3 Li = L(ni, ni1); // local frame L_i
    // vectors to local frame
  //li = li * Li;	// in GLSL: v * M <=> M^T * v
  //vec3 gi = ni * Li;	// guiding vector
  vec3 gi = ni;	// guiding vector
  // return Li * li;

  vec3 x = normalize(ni - ni1 * (dot(ni1, ni)));

    // if the light is not facing the detail, we align with the tangent
  // if(li.x < 0.) // equivalent to the dot product check from the paper
  if(dot(normalize(li), Li[0]) >= 0.) // equivalent to the dot product check from the paper
  {
    gi = vec3(-gi.z, gi.y, gi.x);
    // return GREEN;
  }

  vec2 gp = normalize(gi.xy);
  vec2 lp = normalize(li.xy);
  float tha = acos(dot(lp, gp));    // azimuthal angle
  float lmbd1 = 1. - min(1., tha / HALFPI); // confidence value lambda_1
  float lmbd2 = length((ni * Li).xy);   // confidence value lambda_2

  float theta = si * W(lmbd1 * lmbd2) * acos(dot(li, gi));
  vec3 a = normalize(cross(li, gi));	 // rotation axis a

  // return PURP;
  // return Li * rotateLight(li, a, theta); // we return the rotated light direction
  return rotateLight(li, a, theta); // we return the rotated light direction
}

// ////////////////////////////////!
// // LOCAL LIGHT ALIGNMENT - END /!
// ////////////////////////////////!

// float sigmaD(in int i) {
//   // return (DIFF && S_[i] > 0. ? SD[i] : 0.);
//   return 0.5;
// }

// float sigmaS(in int i) {
//   return (SPEC && S_[i] > 0. ? SS[i] : 0.);
// }

// https://blog.selfshadow.com/publications/s2013-shading-course/hoffman/s2013_pbs_physics_math_notes.pdf
// float spec(in vec3 l, in vec3 n, in vec3 v, float ap, float f0) {
//   vec3 h = normalize(l + v); // half-vector
//   float D = (ap + 2.) / (6.2832) * pow(dot(n, h), ap); // distribution function
//   float G = 1. / dot(l, h); // approximate Cook-Torrance geometry function
//   return D * G * f0;
// }

// void load() { // load global state of the shader (sigma values)
//   SD = texelFetch(iChannel0, ivec2(2, 0), 0).xyz; // sigma for diffuse
//   SS = texelFetch(iChannel0, ivec2(3, 0), 0).xyz; // sigma for specular

//     // is diff/spec scale i being set right now?
//   vec4 TDt = texelFetch(iChannel0, ivec2(4, 0), 0);
//   vec4 TSt = texelFetch(iChannel0, ivec2(5, 0), 0);
//   TD = bool[](TDt.x > 0., TDt.y > 0., TDt.z > 0., TDt.w > 0.);
//   TS = bool[](TSt.x > 0., TSt.y > 0., TSt.z > 0.);
//   LVL = TSt.w;
// }

void main() {
  // load();
  // col = vec4(0.);

  // vec3 ro = vec3(0.); //vec3(iTime*0.02, 0.2*cos(iTime*0.1), 0.);
  // vec3 l, ld, ls, rd = rayd(u, R, T);          // incident view vector
  // l = normalize(vec3(-.5, 0., -1.));  // light direction

  // vec3 t = vec3(0., 1., 0.);
  // vec3 b = normalize(cross(t, l));
  // t = normalize(cross(l, b));
  // ld = ls = normalize(l + t * .6 * sin(iTime) + b * .6 * cos(iTime)); // move the light in a cone

  // enhancement using local light alignment

  vec3 ld = lightDirection;

  // for(int i = S - 2; i >= 0; --i) {
  // ld = adjustLight(N(i), N(i + 1), ld, rd, sigmaD(i), false);

  vec3 ni = texture(tScaleFine, vUv).xyz;
  vec3 ni1 = texture(tScaleFine, vUv).xyz;
  if(ni == vec3(0) || ni1 == vec3(0)) {
    gl_FragColor = vec4(BACKGROUNDCOLOR, 1.);
    return;
  }
  vec3 ld_adjusted = adjustLight(ni, ni1, LIGHT, sigma);
  //   // ls = adjustLight(N(i), N(i + 1), ls, rd, sigmaS(i), true);
  // }

    // lighting
  // vec3 n = N(0);
  // vec3 kd = .7 * vec3(1.2, 1.1, .8) * max(0., dot(n, ld)) * texture(iChannel1, (ro + DIST * rd).xy).rgb;
  // vec3 ks = vec3(.3 * spec(ls, n, -rd, 10., .9));
  // vec4 c = vec4(kd + ks, 1.);

  vec3 n = texture2D(tScaleFine, vUv).xyz;
  vec3 col = max(dot(n, ld_adjusted), 0.) * ALBEDO;
  gl_FragColor = vec4(col, 1.);
}
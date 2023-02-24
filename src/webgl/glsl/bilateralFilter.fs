#define F 0.619928135

uniform highp sampler2D tNormal;
uniform highp sampler2D tDepth;
uniform float sigmaR;
uniform float sigmaS;

varying vec2 vUv;

vec4 getDepth(in vec2 position) {
  return texture(tDepth, position);
}

vec4 getNormal(in vec2 position) {
  return texture(tNormal, position);
}

void main() {
  const float epsilon = 1e-12;

  float sigmaSpatial = max(sigmaS, epsilon);
  float halfWindowSize = ceil(sigmaSpatial / F);
  vec2 pixelSize = 1.0 / vec2(textureSize(tNormal, 0)); // Both textures should be the same size

  float facS = -1. / (2. * sigmaSpatial * sigmaSpatial);
  float facL = -1. / (2. * sigmaR * sigmaR);

  float sumWeights = 0.;
  vec4 sumNormals = vec4(0.);

  vec4 referenceDepth = getDepth(vUv);

  // Iterate over fragments inside the window
  for(float i = -halfWindowSize; i <= halfWindowSize; ++i) {
    for(float j = -halfWindowSize; j <= halfWindowSize; ++j) {
      vec2 omegaPosition = vec2(i, j);
      vec4 omegaDepth = getDepth(vUv + omegaPosition * pixelSize);
      vec4 omegaNormal = getNormal(vUv + omegaPosition * pixelSize);

      // distances to reference fragment in spatial and range terms
      float distanceSpatial = length(omegaPosition);
      float distanceDepth = length(omegaDepth - referenceDepth);

      float weightedSpatialFactor = exp(facS * float(distanceSpatial * distanceSpatial));
      float weightedDepthFactor = exp(facL * float(distanceDepth * distanceDepth));
      float weight = weightedSpatialFactor * weightedDepthFactor;

      sumWeights += weight;
      sumNormals += omegaNormal * weight;
    }
  }

  gl_FragColor = sumNormals / sumWeights;
}
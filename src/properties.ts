type Properties = {
  testSuites?: TestSuite[];
  runTests?: Function;
  downloadPrompt?: Function;
  textureResolution: number;
  textureResolutionHigh: number;
  lightPosition: {
    x: number;
    y: number;
    z: number;
  };
  bilateralFilter: {
    SigmaS: number;
    SigmaSMultiplier: number;
    SigmaR: number;
  };
  localLightAlignment: {
    Sigma_0: number;
    Sigma_1: number;
    Sigma_2: number;
    Sigma_3: number;
    Sigma_4: number;
    Sigma_5: number;
    Sigma_all: number;
    Epsilon: number;
    Gamma: number;
    numberOfScales: number;
  };
};

type Test = Properties & { testName: string };

type TestSuite = {
  name: string;
  runTestSuite?: Function;
  tests: Test[];
};

const deafultProperties: Properties = {
  textureResolution: 512,
  textureResolutionHigh: 1024,
  lightPosition: {
    x: 0,
    y: 1,
    z: 0.5,
  },
  bilateralFilter: {
    SigmaS: 4,
    SigmaSMultiplier: 1.7,
    SigmaR: 0.005,
  },
  localLightAlignment: {
    Sigma_0: 0.5,
    Sigma_1: 0.5,
    Sigma_2: 0.5,
    Sigma_3: 0.5,
    Sigma_4: 0.5,
    Sigma_5: 0.5,
    Sigma_all: 0.5,
    Epsilon: 1e-5,
    Gamma: 3,
    numberOfScales: 6,
  },
};

export { Properties, Test, TestSuite, deafultProperties };

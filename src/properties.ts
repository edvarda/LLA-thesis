type Properties = {
  testSuites?: TestSuite[];
  sigmaVariations?: Partial<Test>[];
  runTests?: Function;
  downloadPrompt?: Function;
  textureResolution?: number;
  textureResolutionHigh?: number;
  lightPosition: {
    x: number;
    y: number;
    z: number;
  };
  bilateralFilter: {
    SigmaS?: number;
    SigmaS_individual?: {
      SigmaS_0?: number;
      SigmaS_1?: number;
      SigmaS_2?: number;
      SigmaS_3?: number;
    };
    SigmaSMultiplier?: number;
    SigmaR?: number;
  };
  localLightAlignment?: {
    Sigma_0?: number;
    Sigma_1?: number;
    Sigma_2?: number;
    Sigma_3?: number;
    Sigma_all?: number;
    Epsilon?: number;
    Gamma?: number;
    numberOfScales?: number;
    testStrength?: number;
  };
};

type Test = Properties & { testName: string };

type TestSuite = {
  name: string;
  runTestSuite?: Function;
  tests: Array<Test>;
};

const defaultProperties: Properties = {
  textureResolution: 1024,
  textureResolutionHigh: 1024,
  lightPosition: {
    x: 0,
    y: 1,
    z: 0.5,
  },
  bilateralFilter: {
    SigmaS: 4,
    SigmaS_individual: {
      SigmaS_0: 2,
      SigmaS_1: 4,
      SigmaS_2: 8,
      SigmaS_3: 16,
    },
    SigmaSMultiplier: 1.7,
    SigmaR: 0.05,
  },
  localLightAlignment: {
    Sigma_0: 0.5,
    Sigma_1: 0.5,
    Sigma_2: 0.5,
    Sigma_3: 0.5,
    Sigma_all: 0.5,
    Epsilon: 5e-5,
    Gamma: 3,
    numberOfScales: 4,
    testStrength: 1,
  },
};

export { Properties, Test, TestSuite, defaultProperties };

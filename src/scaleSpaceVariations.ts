import { Test } from "./properties";

function getScaleVariationWithMultiplier(multiplier: number) {
  let parameters = {
    testName: "",
    bilateralFilter: {
      SigmaS_individual: {
        SigmaS_0: 0,
        SigmaS_1: 0,
        SigmaS_2: 0,
        SigmaS_3: 0,
      },
    },
  };
  let current = 1;
  for (let i = 0; i < 6; i++) {
    current = Math.round(current * multiplier * 100) / 100;
    parameters.bilateralFilter.SigmaS_individual[`SigmaS_${i}`] = current;
  }
  parameters.testName = `SigmaSpatial[${parameters.bilateralFilter.SigmaS_individual.SigmaS_0} .. ${parameters.bilateralFilter.SigmaS_individual.SigmaS_3}]`;
  return parameters;
}

const spatialVariables: Partial<Test>[] = [
  getScaleVariationWithMultiplier(1.7),
  getScaleVariationWithMultiplier(2),
  getScaleVariationWithMultiplier(2.3),
  getScaleVariationWithMultiplier(2.6),
];

const rangeVariables: Partial<Test>[] = [
  // {
  //   testName: "SigmaRange[0.5]",
  //   bilateralFilter: {
  //     SigmaR: 0.5,
  //   },
  // },
  {
    testName: "SigmaRange[0.1]",
    bilateralFilter: {
      SigmaR: 0.1,
    },
  },
  {
    testName: "SigmaRange[0.05]",
    bilateralFilter: {
      SigmaR: 0.05,
    },
  },
  {
    testName: "SigmaRange[0.01]",
    bilateralFilter: {
      SigmaR: 0.01,
    },
  },
  {
    testName: "SigmaRange[0.005]",
    bilateralFilter: {
      SigmaR: 0.005,
    },
  },
  // {
  //   testName: "SigmaRange[0.001]",
  //   bilateralFilter: {
  //     SigmaR: 0.001,
  //   },
  // },
  // {
  //   testName: "SigmaRange[0.0005]",
  //   bilateralFilter: {
  //     SigmaR: 0.0005,
  //   },
  // },
];

const scaleSpaceVariationsWithRange: Partial<Test>[] = [];

for (const spatialTestCase of spatialVariables) {
  for (const rangeTestCase of rangeVariables) {
    let testName = spatialTestCase.testName + rangeTestCase.testName;
    scaleSpaceVariationsWithRange.push({
      bilateralFilter: {
        ...spatialTestCase.bilateralFilter,
        ...rangeTestCase.bilateralFilter,
      },
      testName,
    });
  }
}

export { scaleSpaceVariationsWithRange, spatialVariables };

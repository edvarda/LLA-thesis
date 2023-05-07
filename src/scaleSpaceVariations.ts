import { Test, TestSuite, defaultProperties } from "./properties";

const template = {
  testName: "SigmaSpatial[2..64]",
  bilateralFilter: {
    SigmaS_individual: {
      SigmaS_0: 2,
      SigmaS_1: 4,
      SigmaS_2: 8,
      SigmaS_3: 16,
      SigmaS_4: 32,
      SigmaS_5: 64,
    },
  },
};

function getScaleVariationWithMultiplier(multiplier: number) {
  let parameters = {
    testName: "",
    bilateralFilter: {
      SigmaS_individual: {
        SigmaS_0: 0,
        SigmaS_1: 0,
        SigmaS_2: 0,
        SigmaS_3: 0,
        SigmaS_4: 0,
        SigmaS_5: 0,
      },
    },
  };
  let current = 1;
  for (let i = 0; i < 6; i++) {
    current = Math.round(current * multiplier * 100) / 100;
    parameters.bilateralFilter.SigmaS_individual[`SigmaS_${i}`] = current;
  }
  parameters.testName = `SigmaSpatial[${parameters.bilateralFilter.SigmaS_individual.SigmaS_0} .. ${parameters.bilateralFilter.SigmaS_individual.SigmaS_5}]`;
  return parameters;
}

// const spatialVariables: Partial<Test>[] = [
//   {
//     testName: "SigmaSpatial[2..64]",
//     bilateralFilter: {
//       SigmaS_individual: {
//         SigmaS_0: 2,
//         SigmaS_1: 4,
//         SigmaS_2: 8,
//         SigmaS_3: 16,
//         SigmaS_4: 32,
//         SigmaS_5: 64,
//       },
//     },
//   },
//   {
//     testName: "SigmaSpatial[4..4]",
//     bilateralFilter: {
//       SigmaS_individual: {
//         SigmaS_0: 4,
//         SigmaS_1: 4,
//         SigmaS_2: 4,
//         SigmaS_3: 4,
//         SigmaS_4: 4,
//         SigmaS_5: 4,
//       },
//     },
//   },
//   {
//     testName: "SigmaSpatial[24..24]",
//     bilateralFilter: {
//       SigmaS_individual: {
//         SigmaS_0: 24,
//         SigmaS_1: 24,
//         SigmaS_2: 24,
//         SigmaS_3: 24,
//         SigmaS_4: 24,
//         SigmaS_5: 24,
//       },
//     },
//   },
// ];

const spatialVariables: Partial<Test>[] = [
  getScaleVariationWithMultiplier(1.7),
  getScaleVariationWithMultiplier(2),
  getScaleVariationWithMultiplier(2.3),
  getScaleVariationWithMultiplier(2.6),
];

const rangeVariables: Partial<Test>[] = [
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
];

const scaleSpaceVariations: Partial<Test>[] = [];

for (const spatialTestCase of spatialVariables) {
  for (const rangeTestCase of rangeVariables) {
    let testName = spatialTestCase.testName + rangeTestCase.testName;
    scaleSpaceVariations.push({
      bilateralFilter: {
        ...spatialTestCase.bilateralFilter,
        ...rangeTestCase.bilateralFilter,
      },
      testName,
    });
  }
}

export default scaleSpaceVariations;

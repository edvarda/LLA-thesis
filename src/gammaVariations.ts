import { Test, defaultProperties } from "./properties";

const gammaVariations: Partial<Test>[] = [
  {
    testName: "Gamma[0.5]",
    localLightAlignment: {
      Gamma: 0.5,
    },
  },
  {
    testName: "Gamma[1]",
    localLightAlignment: {
      Gamma: 1,
    },
  },
  {
    testName: "Gamma[2]",
    localLightAlignment: {
      Gamma: 2,
    },
  },
  {
    testName: "Gamma[3]",
    localLightAlignment: {
      Gamma: 3,
    },
  },
  {
    testName: "Gamma[4]",
    localLightAlignment: {
      Gamma: 4,
    },
  },
  {
    testName: "Gamma[6]",
    localLightAlignment: {
      Gamma: 6,
    },
  },
];

export default gammaVariations;

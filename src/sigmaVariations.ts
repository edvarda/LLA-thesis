import { Test, defaultProperties } from "./properties";

const scaleSeparations: Partial<Test>[] = [
  {
    testName: "Scale[1]",
    localLightAlignment: {
      Sigma_0: 1,
      Sigma_1: 0,
      Sigma_2: 0,
      Sigma_3: 0,
      Sigma_4: 0,
      Sigma_5: 0,
    },
  },
  {
    testName: "Scale[2]",
    localLightAlignment: {
      Sigma_0: 0,
      Sigma_1: 1,
      Sigma_2: 0,
      Sigma_3: 0,
      Sigma_4: 0,
      Sigma_5: 0,
    },
  },
  {
    testName: "Scale[3]",
    localLightAlignment: {
      Sigma_0: 0,
      Sigma_1: 0,
      Sigma_2: 1,
      Sigma_3: 0,
      Sigma_4: 0,
      Sigma_5: 0,
    },
  },
  {
    testName: "Scale[4]",
    localLightAlignment: {
      Sigma_0: 0,
      Sigma_1: 0,
      Sigma_2: 0,
      Sigma_3: 1,
      Sigma_4: 0,
      Sigma_5: 0,
    },
  },
  {
    testName: "Scale[5]",
    localLightAlignment: {
      Sigma_0: 0,
      Sigma_1: 0,
      Sigma_2: 0,
      Sigma_3: 0,
      Sigma_4: 1,
      Sigma_5: 0,
    },
  },
  {
    testName: "Scale[6]",
    localLightAlignment: {
      Sigma_0: 0,
      Sigma_1: 0,
      Sigma_2: 0,
      Sigma_3: 0,
      Sigma_4: 0,
      Sigma_5: 1,
    },
  },
  {
    testName: "Scale[Fine]",
    localLightAlignment: {
      Sigma_0: 1,
      Sigma_1: 1,
      Sigma_2: 1,
      Sigma_3: 0,
      Sigma_4: 0,
      Sigma_5: 0,
    },
  },
  {
    testName: "Scale[Coarse]",
    localLightAlignment: {
      Sigma_0: 0,
      Sigma_1: 0,
      Sigma_2: 0,
      Sigma_3: 1,
      Sigma_4: 1,
      Sigma_5: 1,
    },
  },
  {
    testName: "Scale[All]",
    localLightAlignment: {
      Sigma_0: 1,
      Sigma_1: 1,
      Sigma_2: 1,
      Sigma_3: 1,
      Sigma_4: 1,
      Sigma_5: 1,
    },
  },
];

export default scaleSeparations;
import { TestSuite, deafultProperties } from "./properties";

const tests: TestSuite = {
  name: "sigmaTests",
  tests: [
    {
      ...deafultProperties,
      testName: "Scale_1",
      localLightAlignment: {
        ...deafultProperties.localLightAlignment,
        Sigma_0: 0.5,
        Sigma_1: 0,
        Sigma_2: 0,
        Sigma_3: 0,
        Sigma_4: 0,
        Sigma_5: 0,
        Sigma_all: 0,
      },
    },
    {
      ...deafultProperties,
      testName: "Scale_2",
      localLightAlignment: {
        ...deafultProperties.localLightAlignment,
        Sigma_0: 0,
        Sigma_1: 0.5,
        Sigma_2: 0,
        Sigma_3: 0,
        Sigma_4: 0,
        Sigma_5: 0,
        Sigma_all: 0,
      },
    },
    {
      ...deafultProperties,
      testName: "Scale_3",
      localLightAlignment: {
        ...deafultProperties.localLightAlignment,
        Sigma_0: 0,
        Sigma_1: 0,
        Sigma_2: 0.5,
        Sigma_3: 0,
        Sigma_4: 0,
        Sigma_5: 0,
        Sigma_all: 0,
      },
    },
    {
      ...deafultProperties,
      testName: "Scale_4",
      localLightAlignment: {
        ...deafultProperties.localLightAlignment,
        Sigma_0: 0,
        Sigma_1: 0,
        Sigma_2: 0,
        Sigma_3: 0.5,
        Sigma_4: 0.5,
        Sigma_5: 0.5,
        Sigma_all: 0,
      },
    },
    {
      ...deafultProperties,
      testName: "Scale_1_2",
      localLightAlignment: {
        ...deafultProperties.localLightAlignment,
        Sigma_0: 0.5,
        Sigma_1: 0.5,
        Sigma_2: 0,
        Sigma_3: 0,
        Sigma_4: 0,
        Sigma_5: 0,
        Sigma_all: 0,
      },
    },
    {
      ...deafultProperties,
      testName: "Scale_3_4",
      localLightAlignment: {
        ...deafultProperties.localLightAlignment,
        Sigma_0: 0,
        Sigma_1: 0,
        Sigma_2: 0.5,
        Sigma_3: 0.5,
        Sigma_4: 0.5,
        Sigma_5: 0.5,
        Sigma_all: 0,
      },
    },
    {
      ...deafultProperties,
      testName: "Scale_all",
      localLightAlignment: {
        ...deafultProperties.localLightAlignment,
        Sigma_0: 0.5,
        Sigma_1: 0.5,
        Sigma_2: 0.5,
        Sigma_3: 0.5,
        Sigma_4: 0.5,
        Sigma_5: 0.5,
        Sigma_all: 0.5,
      },
    },
  ],
};

export default tests;

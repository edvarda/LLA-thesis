import {
  scaleSpaceVariationsWithRange,
  spatialVariables,
} from "./scaleSpaceVariations";
import gammaVariations from "./gammaVariations";
import { Test, TestSuite, defaultProperties } from "./properties";

const scaleSpaceTests: TestSuite = {
  name: "ScaleSpaceTests",
  tests: scaleSpaceVariationsWithRange.map(
    (variables: Partial<Test>): Test => ({
      ...defaultProperties,
      ...variables,
      testName: variables.testName,
    })
  ),
};

const strengthTest = (strength: number): Test[] => {
  const strengthTests: Test[] = [];
  for (const spatialTestCase of spatialVariables) {
    let testName = spatialTestCase.testName + `Strength[${strength}]`;
    let test: Test = {
      ...defaultProperties,
      bilateralFilter: {
        ...defaultProperties.bilateralFilter,
        ...spatialTestCase.bilateralFilter,
      },
      localLightAlignment: {
        ...defaultProperties.localLightAlignment,
        testStrength: strength,
      },
      testName: testName,
    };
    strengthTests.push(test);
  }
  return strengthTests;
};

const enhancementStrengthTests: TestSuite = {
  name: "StrengthTests",
  tests: [
    ...strengthTest(0.25),
    ...strengthTest(0.5),
    ...strengthTest(0.75),
    ...strengthTest(1),
  ],
};

console.log(scaleSpaceTests);
export { scaleSpaceTests, enhancementStrengthTests };

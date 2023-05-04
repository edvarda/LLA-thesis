import scaleSpaceVariations from "./scaleSpaceVariations";
import gammaVariations from "./gammaVariations";
import { Test, TestSuite, defaultProperties } from "./properties";

const scaleSpaceTests: TestSuite = {
  name: "ScaleSpaceTests",
  tests: scaleSpaceVariations.map(
    (variables: Partial<Test>): Test => ({
      ...defaultProperties,
      ...variables,
      testName: variables.testName,
    })
  ),
};

export { scaleSpaceTests };

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

const strengthTest = (strength: number): Test => ({
  ...defaultProperties,
  localLightAlignment: { ...defaultProperties.localLightAlignment, testStrength: strength } ,
  testName: `Strength[${strength}]`,
});

const enhancementStrengthTests: TestSuite = {
  name: "EnhancementStrengthTests",
  tests: [
    strengthTest(0.25),
    strengthTest(0.5),
    strengthTest(0.75),
    strengthTest(1),
  ],
};

console.log(enhancementStrengthTests)
export { scaleSpaceTests, enhancementStrengthTests };

/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src/__tests__"],
  moduleNameMapper: {
    // Map SDK imports to their CJS builds for Jest
    "^@canva/design$": "<rootDir>/node_modules/@canva/design/lib/cjs/sdk/design/index.js",
    "^@canva/asset$": "<rootDir>/node_modules/@canva/asset/lib/cjs/sdk/asset/index.js",
    "^@canva/platform$": "<rootDir>/node_modules/@canva/platform/lib/cjs/sdk/platform/index.js",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Relax module resolution for Jest (CommonJS environment)
          module: "CommonJS",
          moduleResolution: "node",
          jsx: "react-jsx",
        },
      },
    ],
  },
};

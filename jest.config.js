module.exports = {
  preset: 'ts-jest',
  testPathIgnorePatterns: [
    "/node_modules/",
    ".tmp",
    ".cache"
  ],
  testEnvironment: "node",
  moduleNameMapper: {
    "^/create-service$": "<rootDir>/create-service"
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};


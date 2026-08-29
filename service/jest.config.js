process.env.NODE_ENV = 'test';

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['**/*.ts', '!**/encodedTransformWorkerFactory.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
  },
  moduleNameMapper: {
    // The real factory uses `import.meta.url`, which ts-jest cannot compile to CommonJS.
    '^\\./encodedTransformWorkerFactory$': '<rootDir>/src/webrtc/__mocks__/encodedTransformWorkerFactory.ts',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(tsx?)$',
};

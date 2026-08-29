process.env.NODE_ENV = 'test';

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['**/*.ts'],
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
  },
  // e2e/*.spec.ts are Playwright specs (run via `npx playwright test`), not
  // Jest tests — they use Playwright's own `test`/`expect` globals and are
  // incompatible with Jest's test runner.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(tsx?)$',
};

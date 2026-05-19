process.env.NODE_ENV = 'test';

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['**/*.ts'],
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(tsx?)$',
  coveragePathIgnorePatterns: ['/node_modules/', '/client/'], 
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],  
};
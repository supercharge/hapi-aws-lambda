'use strict'

module.exports = {
  collectCoverage: true,
  coverageReporters: ['text', 'html'],
  setupFilesAfterEnv: ['jest-extended'],
  testMatch: ['<rootDir>/test/**/*.[jt]s'],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/examples']
}

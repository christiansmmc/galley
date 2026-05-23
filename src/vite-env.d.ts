/// <reference types="vite/client" />
import "@testing-library/jest-dom";

declare module "vitest" {
  interface Assertion<T> extends jest.Matchers<void, T> {}
  interface AsymmetricMatchersContaining extends jest.Matchers<void, unknown> {}
}

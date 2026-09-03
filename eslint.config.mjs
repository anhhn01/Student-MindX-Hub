import { nextJsConfig } from "eslint-config-next";

export default [
  ...nextJsConfig,
  {
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
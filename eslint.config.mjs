import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
    ...nextVitals,
    ...nextTypescript,
    {
        ignores: [
            ".next/**",
            "node_modules/**",
            "next-env.d.ts",
            "tsconfig.tsbuildinfo"
        ]
    },
    {
        rules: {
            "@next/next/no-img-element": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/static-components": "off"
        }
    }
];

export default eslintConfig;

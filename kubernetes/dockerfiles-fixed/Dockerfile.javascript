FROM node:20-slim

# Install ESLint, Prettier, TypeScript and other JavaScript tools
RUN npm install -g \
    eslint@latest \
    prettier@latest \
    typescript@latest \
    @typescript-eslint/eslint-plugin@latest \
    @typescript-eslint/parser@latest \
    eslint-plugin-security@latest \
    eslint-plugin-node@latest \
    jshint@latest \
    && npm cache clean --force

# Create a default ESLint configuration for v9+
RUN echo 'import js from "@eslint/js";\n\
import security from "eslint-plugin-security";\n\
import tseslint from "@typescript-eslint/eslint-plugin";\n\
import tsParser from "@typescript-eslint/parser";\n\
\n\
export default [\n\
  js.configs.recommended,\n\
  {\n\
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],\n\
    plugins: {\n\
      security: security,\n\
      "@typescript-eslint": tseslint\n\
    },\n\
    languageOptions: {\n\
      parser: tsParser,\n\
      ecmaVersion: "latest",\n\
      sourceType: "module"\n\
    },\n\
    rules: {\n\
      "no-eval": "error",\n\
      "no-implied-eval": "error",\n\
      "security/detect-eval-with-expression": "error",\n\
      "security/detect-non-literal-regexp": "warn",\n\
      "security/detect-non-literal-fs-filename": "warn"\n\
    }\n\
  }\n\
];' > /etc/eslint.config.mjs

# Create a default Prettier config
RUN echo '{\n\
  "semi": true,\n\
  "trailingComma": "es5",\n\
  "singleQuote": true,\n\
  "printWidth": 100,\n\
  "tabWidth": 2\n\
}' > /etc/.prettierrc

# Create a default TypeScript config
RUN echo '{\n\
  "compilerOptions": {\n\
    "target": "ES2020",\n\
    "module": "commonjs",\n\
    "lib": ["ES2020"],\n\
    "strict": true,\n\
    "esModuleInterop": true,\n\
    "skipLibCheck": true,\n\
    "forceConsistentCasingInFileNames": true,\n\
    "noUnusedLocals": true,\n\
    "noUnusedParameters": true,\n\
    "noImplicitReturns": true,\n\
    "noFallthroughCasesInSwitch": true\n\
  }\n\
}' > /etc/tsconfig.json

WORKDIR /workspace

# Set environment variable to use default configs
ENV ESLINT_USE_FLAT_CONFIG=true
ENV ESLINT_CONFIG_FILE=/etc/eslint.config.mjs

CMD ["/bin/bash"]
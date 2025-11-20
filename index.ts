#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Config {
  projectName: string;
  agentFunction: string;
  promptName: string;
  schemaName: string;
  inputType: string;
  inputField: string;
}

function readTemplate(templateName: string): string {
  const templatePath = path.join(__dirname, "templates", `${templateName}.template`);
  return fs.readFileSync(templatePath, "utf-8");
}

function replacePlaceholders(template: string, config: Config): string {
  return template
    .replace(/\{\{agentFunction\}\}/g, config.agentFunction)
    .replace(/\{\{promptName\}\}/g, config.promptName)
    .replace(/\{\{schemaName\}\}/g, config.schemaName)
    .replace(/\{\{InputType\}\}/g, config.inputType)
    .replace(/\{\{inputField\}\}/g, config.inputField);
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function ensureAgentSuffix(name: string): string {
  if (name.endsWith("-agent")) {
    return name;
  }
  return `${name}-agent`;
}

function getBaseName(name: string): string {
  return name.replace(/-agent$/, "");
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("❌ Error: Agent name is required");
    console.log("\nUsage: create-bzp-agent <name-of-the-agent>");
    console.log("\nExample: create-bzp-agent my-agent");
    console.log("         create-bzp-agent chatbot");
    process.exit(1);
  }

  const agentName = args[0];
  const projectName = ensureAgentSuffix(agentName);
  const baseName = getBaseName(agentName);
  
  console.log(`🚀 Creating agent: ${projectName}\n`);

  // Auto-generate config
  const config: Config = {
    projectName,
    agentFunction: toCamelCase(baseName),
    promptName: `${toCamelCase(baseName)}Prompt`,
    schemaName: `${toCamelCase(baseName)}Schema`,
    inputType: `${toPascalCase(baseName)}Request`,
    inputField: "input",
  };

  const absoluteOutputDir = path.resolve(projectName);

  // Check if directory exists
  if (fs.existsSync(absoluteOutputDir)) {
    console.error(`❌ Error: Directory ${absoluteOutputDir} already exists`);
    process.exit(1);
  }

  // Create directory structure
  fs.mkdirSync(absoluteOutputDir, { recursive: true });
  const srcDir = path.join(absoluteOutputDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  // Generate files
  const files = [
    { template: "server.ts", output: path.join("src", "server.ts") },
    { template: "prompt.ts", output: path.join("src", "prompt.ts") },
    { template: "types.ts", output: path.join("src", "types.ts") },
    { template: "ai.ts", output: path.join("src", "ai.ts") },
    { template: "env.example", output: ".env.example" },
  ];

  console.log("📝 Generating files...\n");

  for (const file of files) {
    const template = readTemplate(file.template);
    const content = replacePlaceholders(template, config);
    const outputPath = path.join(absoluteOutputDir, file.output);
    fs.writeFileSync(outputPath, content);
    console.log(`  ✓ ${file.output}`);
  }

  // Generate package.json
  const packageJson = {
    name: projectName,
    version: "1.0.0",
    description: "",
    main: "src/server.ts",
    scripts: {
      dev: "tsx watch src/server.ts",
      start: "tsx src/server.ts",
    },
    keywords: [],
    author: "",
    license: "ISC",
    devDependencies: {
      "@types/node": "^24.10.1",
      "tsx": "^4.20.6",
      "typescript": "^5.9.3",
    },
    dependencies: {
      "@ai-sdk/azure": "^2.0.70",
      "@ai-sdk/openai": "^2.0.68",
      "ai": "^5.0.93",
      "dotenv": "^17.2.3",
      "fastify": "^5.6.2",
      "zod": "^4.1.12",
    },
  };
  fs.writeFileSync(
    path.join(absoluteOutputDir, "package.json"),
    JSON.stringify(packageJson, null, 2) + "\n"
  );
  console.log("  ✓ package.json");

  // Generate tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "commonjs",
      lib: ["ES2022"],
      outDir: "./dist",
      rootDir: "./src",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      moduleResolution: "node",
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"],
  };
  fs.writeFileSync(
    path.join(absoluteOutputDir, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2) + "\n"
  );
  console.log("  ✓ tsconfig.json");

  // Generate .gitignore
  const gitignore = `node_modules/
dist/
.env
*.log
.DS_Store
`;
  fs.writeFileSync(path.join(absoluteOutputDir, ".gitignore"), gitignore);
  console.log("  ✓ .gitignore");

  console.log(`\n✅ Success! Created ${projectName}\n`);
  console.log("Next steps:");
  console.log(`  cd ${projectName}`);
  console.log("  cp .env.example .env");
  console.log("  # Edit .env with your API keys");
  console.log("  pnpm install");
  console.log("  pnpm dev");
}

main();


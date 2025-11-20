#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { spawn, execSync } from "child_process";
import { createInterface } from "readline";

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

function promptUser(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function detectPlatform(): "macos" | "linux" | "windows" | "unknown" {
  const platform = process.platform;
  if (platform === "darwin") return "macos";
  if (platform === "linux") return "linux";
  if (platform === "win32") return "windows";
  return "unknown";
}

async function installOllamaMacOS(): Promise<void> {
  console.log("   Installing Ollama via Homebrew...");
  if (!checkCommand("brew")) {
    throw new Error("Homebrew is not installed. Please install Homebrew first: https://brew.sh");
  }
  await runCommand("brew", ["install", "ollama"]);
}

async function installOllamaLinux(): Promise<void> {
  console.log("   Installing Ollama via official installer...");
  // The install script needs to be piped to sh
  return new Promise((resolve, reject) => {
    const curl = spawn("curl", ["-fsSL", "https://ollama.ai/install.sh"], {
      stdio: ["ignore", "pipe", "inherit"],
    });

    const sh = spawn("sh", [], {
      stdio: ["pipe", "inherit", "inherit"],
    });

    curl.stdout?.pipe(sh.stdin!);
    
    // Close sh stdin when curl finishes
    curl.on("close", () => {
      sh.stdin?.end();
    });

    curl.on("error", reject);
    sh.on("error", reject);

    sh.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Installation failed with exit code ${code}`));
      }
    });
  });
}

async function installOllamaWindows(): Promise<boolean> {
  console.log("   Windows installation requires manual download.");
  console.log("   Please download and install Ollama from: https://ollama.ai/download");
  console.log("   After installation, restart your terminal and run this command again.");
  return false;
}

async function installOllama(): Promise<boolean> {
  const platform = detectPlatform();

  try {
    if (platform === "macos") {
      await installOllamaMacOS();
      return true;
    } else if (platform === "linux") {
      await installOllamaLinux();
      return true;
    } else if (platform === "windows") {
      return await installOllamaWindows();
    } else {
      console.log("   Unsupported platform. Please install Ollama manually from https://ollama.ai");
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Installation failed: ${error}`);
    return false;
  }
}

async function startOllamaService(): Promise<void> {
  // Check if Ollama service is already running
  try {
    execSync("ollama list", { stdio: "ignore", timeout: 5000 });
    console.log("  ✓ Ollama service is running");
    return;
  } catch {
    // Service is not running, try to start it
  }

  console.log("  Starting Ollama service...");

  // On macOS/Linux, try to start in background
  const platform = detectPlatform();
  if (platform === "windows") {
    // On Windows, the service should start automatically after installation
    // Just check if it's available
    try {
      execSync("ollama list", { stdio: "ignore", timeout: 10000 });
      console.log("  ✓ Ollama service is running");
    } catch {
      console.log("  ⚠️  Ollama service doesn't seem to be running.");
      console.log("   Please start it manually or restart your terminal.");
      throw new Error("Ollama service not running");
    }
  } else {
    // On macOS/Linux, start ollama serve in background
    try {
      spawn("ollama", ["serve"], {
        stdio: "ignore",
        detached: true,
      }).unref();

      // Wait a bit for service to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify it's running
      execSync("ollama list", { stdio: "ignore", timeout: 5000 });
      console.log("  ✓ Ollama service started");
    } catch {
      console.log("  ⚠️  Could not start Ollama service automatically.");
      console.log("   Please start it manually with: ollama serve");
      throw new Error("Could not start Ollama service");
    }
  }
}

function checkCommand(command: string): boolean {
  try {
    const isWindows = process.platform === "win32";
    const checkCmd = isWindows ? `where ${command}` : `which ${command}`;
    execSync(checkCmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runCommand(command: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      cwd,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

async function setupOllama(shouldInstall: boolean = false): Promise<void> {
  console.log("\n🔍 Checking Ollama installation...");

  const ollamaInstalled = checkCommand("ollama");

  if (!ollamaInstalled) {
    if (shouldInstall) {
      console.log("📦 Installing Ollama...");
      const installSuccess = await installOllama();
      
      if (!installSuccess) {
        console.log("\n⚠️  Ollama installation was not completed.");
        console.log("   Your project has been created, but you'll need to install Ollama manually");
        console.log("   to run the agent locally. Visit https://ollama.ai to download.");
        console.log("   After installation, you can pull the model with: ollama pull llama3.2:1b");
        return;
      }

      // Wait a moment for installation to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify installation
      if (!checkCommand("ollama")) {
        console.log("\n⚠️  Ollama installation completed but command not found.");
        console.log("   Please restart your terminal and run: ollama pull llama3.2:1b");
        return;
      }

      console.log("  ✓ Ollama installed successfully");
    } else {
      console.log("⚠️  Ollama not found.");
      console.log("   Your project will still work - you can set up Ollama later.");
      return;
    }
  } else {
    console.log("  ✓ Ollama is installed");
  }

  // Start Ollama service
  try {
    await startOllamaService();
  } catch (error) {
    console.log("\n⚠️  Could not start Ollama service automatically.");
    console.log("   Please start it manually with: ollama serve");
    console.log("   Then pull the model with: ollama pull llama3.2:1b");
    return;
  }

  // Check if model already exists
  try {
    const output = execSync("ollama list", { encoding: "utf-8" });
    if (output.includes("llama3.2:1b")) {
      console.log("  ✓ Model llama3.2:1b is already available");
      return;
    }
  } catch {
    // Continue to pull if check fails
  }

  // Pull the model
  const model = "llama3.2:1b";
  console.log(`\n📥 Pulling model: ${model}...`);
  console.log("   (This may take a few minutes on first run)");

  try {
    await runCommand("ollama", ["pull", model]);
    console.log(`  ✓ Model ${model} is ready`);
  } catch (error) {
    console.error(`  ⚠️  Failed to pull model automatically`);
    console.log("   You can pull it manually later with: ollama pull llama3.2:1b");
  }
}

async function installDependencies(projectDir: string): Promise<void> {
  console.log("\n📦 Installing dependencies...");

  // Check if pnpm is available
  const pnpmAvailable = checkCommand("pnpm");
  const packageManager = pnpmAvailable ? "pnpm" : "npm";

  try {
    await runCommand(packageManager, ["install"], projectDir);
    console.log(`  ✓ Dependencies installed with ${packageManager}`);
  } catch (error) {
    console.error(`  ❌ Failed to install dependencies: ${error}`);
    console.log(`   Please run manually: cd ${path.basename(projectDir)} && ${packageManager} install`);
  }
}

async function main() {
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

  // Check if Ollama is installed
  let ollamaInstalled = checkCommand("ollama");
  let shouldInstallOllama = false;
  let ollamaSetupComplete = false;

  if (!ollamaInstalled) {
    console.log("💡 Ollama enables your agent to run locally without API keys.");
    console.log("   Your agent will be ready to run immediately after setup.\n");
    const answer = await promptUser("Would you like to install Ollama now? (y/N): ");
    shouldInstallOllama = answer === "y" || answer === "yes";
    
    if (shouldInstallOllama) {
      try {
        await setupOllama(true);
        ollamaSetupComplete = true;
        // Re-check if Ollama is now available
        ollamaInstalled = checkCommand("ollama");
      } catch (error) {
        console.error("\n⚠️  Ollama installation encountered issues, but continuing with project creation...");
        console.log("   You can install Ollama manually later from https://ollama.ai");
      }
    } else {
      console.log("\n   Skipping Ollama installation. You can install it later if needed.");
    }
  }

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
      "@ai-sdk/ollama": "^0.0.30",
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

  // Create .env file from .env.example
  const envExamplePath = path.join(absoluteOutputDir, ".env.example");
  const envPath = path.join(absoluteOutputDir, ".env");
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("  ✓ .env (created from .env.example)");
  }

  console.log(`\n✅ Success! Created ${projectName}\n`);

  // Install dependencies (always do this after file generation)
  console.log("📦 Installing dependencies...");
  try {
    await installDependencies(absoluteOutputDir);
    console.log("  ✓ Dependencies installed\n");
  } catch (error) {
    console.error("\n⚠️  Dependency installation had issues.");
    console.log("   You can install manually:");
    console.log(`   cd ${projectName}`);
    console.log("   pnpm install");
  }

  // Setup Ollama if it wasn't installed earlier (non-blocking)
  let ollamaPromise: Promise<void> | null = null;
  if (ollamaInstalled && !shouldInstallOllama) {
    ollamaPromise = setupOllama(false).catch(() => {
      // Errors are already handled in setupOllama
    });
  }

  // Wait for Ollama setup to complete (or timeout) if it's running
  if (ollamaPromise) {
    try {
      await Promise.race([
        ollamaPromise,
        new Promise((resolve) => setTimeout(resolve, 30000)), // 30s timeout
      ]);
    } catch {
      // Ignore - setupOllama handles its own errors
    }
  }

  console.log(`\n🎉 Setup complete! Your agent is ready to run.\n`);
  
  if (ollamaSetupComplete || ollamaInstalled) {
    console.log("✅ Ollama is installed and configured");
    console.log("✅ Dependencies are installed");
    console.log("✅ Your agent is ready to use locally\n");
  } else {
    console.log("✅ Dependencies are installed");
    console.log("⚠️  To run locally, install Ollama: https://ollama.ai\n");
  }
  
  console.log("Next steps:");
  console.log(`  cd ${projectName}`);
  console.log("  pnpm dev");
  console.log("\nYour server will start on http://localhost:3000");
  console.log("The server will wait for requests. Make a POST request to / with:");
  console.log('  { "input": "your message" }');
}

main();


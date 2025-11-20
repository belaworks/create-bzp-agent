# create-bzp-agent

A simple CLI tool to generate boilerplate code for AI agent applications using Fastify, AI SDK, and Zod.

**✨ Seamless Experience**: Automatically sets up Ollama with a lightweight model (qwen:0.5b) so you can start building immediately without API keys!

## Installation & Usage

### Run from GitHub (no installation needed)

```bash
npx github:your-username/create-bzp-agent <name-of-the-agent>
```

### Install globally

```bash
npm install -g github:your-username/create-bzp-agent
create-bzp-agent <name-of-the-agent>
```

### Or use directly

```bash
create-bzp-agent <name-of-the-agent>
```

The `-agent` suffix will be automatically added if not present.

### Examples

```bash
create-bzp-agent my-agent
# Creates: my-agent/

create-bzp-agent chatbot
# Creates: chatbot-agent/

create-bzp-agent text-processor-agent
# Creates: text-processor-agent/
```

## Generated Structure

The CLI generates the following structure:

```
<name>-agent/
├── src/
│   ├── server.ts      # Fastify server with POST endpoint
│   ├── prompt.ts      # System prompt and Zod schema
│   ├── types.ts       # TypeScript types for input/output
│   └── ai.ts          # AI module handling agent logic
├── .env.example       # Environment variables template
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── .gitignore         # Git ignore file
```

## What Happens When You Run It

The CLI will:
1. ✅ Generate all boilerplate files
2. 🔍 Check if Ollama is installed (optional but recommended)
3. 📥 Pull the `qwen:0.5b` model (if Ollama is available)
4. 📦 Install dependencies automatically
5. 🎉 Your agent is ready to run!

## Next Steps

After generating:

```bash
cd <name>-agent
pnpm dev
```

That's it! Your agent runs on `http://localhost:8090` using Ollama locally.

**Note**: If Ollama isn't installed, the project still works. You can:
- Install Ollama later: https://ollama.ai
- Or configure Azure OpenAI/OpenAI in `.env`

## Stack

- **Fastify** - Web server framework
- **AI SDK** - AI model integration
- **Ollama** - Local AI models (default, no API keys needed!)
- **Zod** - Schema validation
- **dotenv** - Environment variable management
- **TypeScript** - Type safety

## Model Options

By default, the generated agent uses **Ollama with qwen:0.5b** (lightweight, runs locally).

You can also configure:
- **Azure OpenAI** - Set `AZURE_OPENAI_*` in `.env`
- **OpenAI** - Set `OPENAI_API_KEY` in `.env`
- **Other Ollama models** - Change `OLLAMA_MODEL` in `.env`


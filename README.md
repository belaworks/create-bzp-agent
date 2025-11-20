# create-bzp-agent

A simple CLI tool to generate boilerplate code for AI agent applications using Fastify, AI SDK, and Zod.

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

## Next Steps

After generating:

```bash
cd <name>-agent
cp .env.example .env
# Edit .env with your API keys
pnpm install
pnpm dev
```

## Stack

- **Fastify** - Web server framework
- **AI SDK** - AI model integration (Azure OpenAI)
- **Zod** - Schema validation
- **dotenv** - Environment variable management
- **TypeScript** - Type safety


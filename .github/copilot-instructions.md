# Copilot Instructions for vscode-ace-chat

## Project Overview
This project is a VS Code extension that adds a custom chat participant to GitHub Copilot Chat, focused on the ACE/SPEX domain. It enables users to query product and topic information using the `/spex` command, leveraging both local and remote data sources.

## Architecture & Key Components
- **Entry Point:** `src/extension.ts` registers the chat participant (`ace-chat.helper`) and implements the main chat handler logic.
- **Prompt Construction:** Prompts for LLMs are built dynamically, using templates in `src/promptBuilder.ts` and a base prompt in `src/basePrompt.md`.
- **Data Fetching:**
	- Product collections and topics are fetched from the SPEX API via utility functions in `src/utils.ts`.
	- Types for API responses are defined in `src/types/` (e.g., `product.ts`, `productCollection.ts`, `topicContent.ts`).
- **Sample Data:** Example API responses are stored in `data/samples/` for reference and testing.
- **Chat Flow:**
	1. Identify product(s) from user prompt using LLM and product collection.
	2. Identify top relevant topics for the product.
	3. Fetch topic content and generate a summary strictly from that content.

## Developer Workflows
- **Build:**
	- Use `npm run watch` for background TypeScript compilation (default build task).
	- The extension is launched via the "Run Extension" launch config, which depends on the build task.
- **Linting:**
	- Run `npm run lint` to check for lint errors. ESLint config is in `eslint.config.mjs`.
	- Fix all lint errors before considering work complete.
- **Debugging:**
	- Use VS Code's debugger with the provided launch configs in `.vscode/launch.json`.
- **Testing:**
	- No formal test suite is present; use sample data in `data/samples/` and manual chat interactions for validation.

## Project Conventions & Patterns
- **Strict TypeScript:** All code is written in strict mode; see `tsconfig.json`.
- **API Integration:** All product/topic data is fetched from the SPEX API. Do not hardcode product/topic lists.
- **Prompt Engineering:** Prompts are constructed to minimize hallucination—LLMs are instructed to use only provided topic content for answers.
- **Command Handling:** Only the `/spex` command is supported. Add new commands by extending the `commandHandlers` map in `src/extension.ts`.
- **Debug Mode:** Set `debugMode` in `src/extension.ts` to `true` for verbose LLM prompt/response output.

## Integration Points
- **VS Code Chat API:** Uses `vscode.chat.createChatParticipant` and related APIs.
- **SPEX API:** All product/topic data is fetched live from `https://spex.se.com/api/version/1/` endpoints.
- **LLM Model:** Prompts are sent to the Copilot LLM via `request.model.sendRequest`.

## Quick Reference
- Main logic: `src/extension.ts`
- Prompt templates: `src/promptBuilder.ts`, `src/basePrompt.md`
- Data utilities: `src/utils.ts`
- Types: `src/types/`
- Sample data: `data/samples/`
- Build: `npm run watch`
- Lint: `npm run lint`

For more, see [README.md](../README.md) and [VS Code Chat API docs](https://code.visualstudio.com/api/extension-guides/chat).

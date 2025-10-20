# Copilot Instructions for vscode-ace-chat

## Project Overview
This is a VS Code extension that integrates with GitHub Copilot Chat by contributing a custom chat participant. The extension is designed for domain-specific chat interactions within VS Code.

## Architecture & Key Components
- **src/extension.ts**: Main entry point. Registers the chat participant and handles extension activation.
- **src/productService.ts, src/promptBuilder.ts, src/utils.ts**: Core logic for building prompts, handling product data, and utility functions.
- **src/types/**: Type definitions for products, collections, and topic content.
- **data/samples/**: Example data files (`collections.json`, `product.json`, `topic-content.json`) used for chat responses and prompt generation.

## Developer Workflows
- **Install dependencies**: `npm install`
- **Build/watch**: The default build task is `npm: watch` (runs automatically in development).
- **Run extension**: Use the "Run Extension" target in VS Code's Debug view to launch a new window with the extension loaded.
- **No test suite is present**: Focus is on manual testing via the chat UI.

## Patterns & Conventions
- **Prompt Construction**: Prompts are built using `promptBuilder.ts` and may incorporate sample data from `data/samples/`.
- **Type Safety**: All domain objects (products, collections, topics) use explicit TypeScript types from `src/types/`.
- **Data Access**: Data is loaded from local JSON files in `data/samples/` for demonstration and prototyping.
- **Chat Participant**: The extension registers a participant (see `extension.ts`) that responds to chat commands, e.g., `@tutor /exercise`.

## Integration Points
- **VS Code Chat API**: Extension interacts with VS Code's Chat API for participant registration and message handling.
- **External Data**: No external APIs; all data is local and static for this sample.

## Example: Registering a Chat Participant
```ts
// src/extension.ts
vscode.chat.registerParticipant({
  id: 'tutor',
  label: 'Tutor',
  handleMessage: async (message) => { /* ... */ }
});
```

## Quick Reference
- **Build task**: `npm: watch` (background)
- **Main logic**: `src/extension.ts`, `src/productService.ts`, `src/promptBuilder.ts`
- **Sample data**: `data/samples/`
- **Types**: `src/types/`

---
For more details, see the [README.md](../README.md) and [VS Code Chat API docs](https://code.visualstudio.com/api/extension-guides/chat).

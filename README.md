# Chat Tutorial

Visual Studio Code's Copilot Chat architecture enables extension authors to integrate with the GitHub Copilot Chat experience. A chat extension is a VS Code extension that uses the Chat extension API by contributing a Chat participant. Chat participants are domain experts that can answer user queries within a specific domain.

This GitHub Copilot Extension sample shows:

- How to contribute a chat participant to the GitHub Copilot Chat view.

Documentation can be found here:
- https://code.visualstudio.com/api/extension-guides/chat
- https://code.visualstudio.com/api/extension-guides/chat-tutorial

## Running the Sample

	- Start a task `npm: watch` to compile the code
	- Run the extension in a new VS Code window
	- You will see the @spex chat participant in the GitHub Copilot Chat view

## Commands

### /spex
Runs the full workflow:
1. Identifies product(s) from the global product collection using the LLM.
2. Fetches topics for the most confident product.
3. (Now) Narrows candidate topics using the SPEX Search API when possible to reduce token usage.
4. Ranks topics via LLM prompt and selects top 3.
5. Fetches full topic content and generates a grounded summary using ONLY that content.

### /spexsearch
Lightweight search-only answer path:
1. Executes SPEX search against your query (first page, limited results).
2. Displays top hits with direct documentation links.
3. Builds a prompt from highlight snippets only (no full topic content fetch) and asks the LLM to answer strictly from those snippets.
4. If snippets are insufficient, the assistant will ask for a more specific query.

### When to use which
Use `/spexsearch` for quick, exploratory queries or when you just need a pointer. Use `/spex` when you want a deeper, content-grounded summary. If `/spex` has low confidence on product or topics it can fall back to search results (future enhancement).

## Implementation Notes

- Search results are cached in-memory for 5 minutes per query to reduce API calls.
- Highlight snippets are sanitized (HTML stripped, whitespace collapsed, length capped) before being sent to the model.
- Topic narrowing uses search-derived topicIds for the chosen product, falling back to the full topic list if search provides no matches.
- Confidence threshold prevents proceeding when product identification is weak.

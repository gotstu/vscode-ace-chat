import * as vscode from 'vscode';
import { loadBasePrompt, fetchCollections, fetchTopics, fetchChildTopics } from './utils';

let productCollection: { id: number; name: string; tag: string }[] = [];
const debugMode = false; // Set to true to enable debug output
const confidenceThreshold = 0.1;

export async function activate(context: vscode.ExtensionContext) {
	productCollection = await fetchCollections(); // Fetch once and store globally
	const BASE_PROMPT = getBasePrompt(context);
	const handler: vscode.ChatRequestHandler = createChatHandler(BASE_PROMPT);
	const tutor = vscode.chat.createChatParticipant("ace-chat.spex-helper", handler);
	tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, 'schneider.jpg');
}

function getBasePrompt(context: vscode.ExtensionContext): string {
	return loadBasePrompt(context.extensionPath);
}

function createChatHandler(BASE_PROMPT: string): vscode.ChatRequestHandler {
	return async (request: vscode.ChatRequest, chatContext: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) => {
		if (!productCollection || productCollection.length === 0) {
			stream.markdown('Product collections not loaded.');
			return;
		}

		const identifyPrompt = `${BASE_PROMPT}\n\nProduct Collection:\n${JSON.stringify(productCollection, null, 2)}\n\nUser Prompt: ${request.prompt}\n\nTask: Only identify the product(s) from the collection that the user is referring to. Do not provide any other information. Return your answer as a JSON array of objects with "id", "name", "tag", and "confidence" fields.`;

		if (debugMode) {
			stream.markdown('**LLM Prompt:**');
			stream.markdown('```text\n' + identifyPrompt + '\n```');
		}

		const messages = [
			vscode.LanguageModelChatMessage.User(identifyPrompt)
		];

		const chatResponse = await request.model.sendRequest(messages, {}, token);
		let responseText = '';
		if (debugMode) {
			stream.markdown('**LLM Raw Response:**');
		}
		for await (const fragment of chatResponse.text) {
			responseText += fragment;
			if (debugMode) { stream.markdown(fragment); } // Stream fragments as they arrive
		}

		let products: { id: number; name: string; tag: string; confidence: number }[] = [];
		try {
			const match = responseText.match(/\[.*\]/s);
			if (match) {
				products = JSON.parse(match[0]);
				if (debugMode) {
					stream.markdown('**Parsed Products:**\n```json\n' + JSON.stringify(products, null, 2) + '\n```');
				}
			}
		} catch {
			stream.markdown('Could not parse product identification.');
			return;
		}

		// Prevent proceeding if all products have low or near-zero confidence
		const highestConfidence = products.reduce((max, p) => Math.max(max, p.confidence), 0);
		if (highestConfidence < confidenceThreshold) {
			stream.markdown('I am not confident about which product you are referring to. Please clarify your request or choose from the following products:\n');
			productCollection.forEach((product, idx) => {
				stream.markdown(`${idx + 1}. ${product.name} (id: ${product.id})\n`);
			});
			return;
		}

		if (!products || products.length === 0) {
			stream.markdown('You did not provide a topic I can help with. Here are the products I can help with:\n');
			productCollection.forEach((product, idx) => {
				stream.markdown(`${idx + 1}. ${product.name} (id: ${product.id})\n`);
			});
			return;
		}

		const topProduct = products.sort((a, b) => b.confidence - a.confidence)[0];
		const collectionId = Number(topProduct.id);
		if (isNaN(collectionId)) {
			stream.markdown(`Product id "${topProduct.id}" is not a valid collection ID.`);
			return;
		}

		// Show confidence message before fetching topics
		stream.markdown(`I am confident you are asking about '${topProduct.name}' (confidence: ${topProduct.confidence}). I will fetch the topics now.\n\n`);

		let topics: { id: number; name: string }[] = [];
		try {
			topics = await fetchTopics(collectionId);
		} catch {
			stream.markdown(`Failed to fetch topics for ${topProduct.name}.`);
			return;
		}

		// New: Ask LLM to pick top 3 topics relevant to the user prompt
		const topicPrompt = `Product: ${topProduct.name}\nTopics: ${JSON.stringify(topics, null, 2)}\nUser Prompt: ${request.prompt}\n\nTask: From the topics above, identify the top 3 most relevant topics to the user's prompt. Return your answer as a JSON array of objects with "id", "name", and "confidence" as a number between 0 and 1.`;

		// Uncomment these lines if you want to debug topic selection
		// if (debugMode) {
		//     stream.markdown('**LLM Topic Selection Prompt:**');
		//     stream.markdown('```text\n' + topicPrompt + '\n```');
		// }

		const topicMessages = [
			vscode.LanguageModelChatMessage.User(topicPrompt)
		];

		const topicResponse = await request.model.sendRequest(topicMessages, {}, token);

		let topicResponseText = '';
		if (debugMode) {
			stream.markdown('**LLM Topic Raw Response:**');
		}
		for await (const fragment of topicResponse.text) {
			topicResponseText += fragment;
			if (debugMode) { stream.markdown(fragment); }
		}

		let bestTopics: { id: number; name: string; confidence: number }[] = [];
		try {
			const match = topicResponseText.match(/\[.*\]/s);
			if (match) {
				bestTopics = JSON.parse(match[0]);
				if (debugMode) {
					stream.markdown('**Parsed Topics:**\n```json\n' + JSON.stringify(bestTopics, null, 2) + '\n```');
				}
			}
		} catch {
			stream.markdown('Could not parse topic identification.');
			return;
		}

		stream.markdown(`**Top Product:** ${topProduct.name}\n\n**Best Topics:**\n\n`);
		bestTopics.forEach((topic, idx) => {
			const topicUrl = `https://spex.se.com/ui/docs?collectionId=${collectionId}&topicId=${topic.id}`;
			stream.markdown(`${idx + 1}. [${topic.name}](${topicUrl}) (confidence: ${topic.confidence})\n`);
		});

		// Ask AI for a summary based on best topics and user prompt
		const summaryPrompt = `\nYou are an expert assistant. Based on the following topics and the user's prompt, provide a concise summary or answer for the user. Reference the topics as needed, but do not include their full content.\n\nUser Prompt: ${request.prompt}\nBest Topics: ${JSON.stringify(bestTopics, null, 2)}\n\nTask: Write a summary or answer for the user, referencing the topics above as supporting links.`;

		const summaryMessages = [
			vscode.LanguageModelChatMessage.User(summaryPrompt)
		];

		const summaryResponse = await request.model.sendRequest(summaryMessages, {}, token);

		let summaryText = '';
		for await (const fragment of summaryResponse.text) {
			summaryText += fragment;
		}
		stream.markdown(`\n\n**Summary:**\n\n${summaryText}\n`);

		// Optionally, display child topics as links (no content)
		for (const topic of bestTopics) {
			const topicUrl = `https://spex.se.com/ui/docs?collectionId=${collectionId}&topicId=${topic.id}`;
			try {
				const childTopics = await fetchChildTopics(collectionId, topic.id);
				if (childTopics.length > 0) {
					stream.markdown(`### Child Topics for [${topic.name}](${topicUrl}):\n`);
					childTopics.forEach((child, idx) => {
						const childUrl = `https://spex.se.com/ui/docs?collectionId=${collectionId}&topicId=${child.id}\n`;
						stream.markdown(`${idx + 1}. [${child.name}](${childUrl})\n`);
					});
				}
			} catch {
				stream.markdown(`Failed to fetch child topics for ${topic.name}.`);
			}
		}
		return;
	};
}

export function deactivate() { }

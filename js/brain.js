import { state } from './config.js';
import { Memory } from './memory.js';

async function searchWeb(query) {
    try {
        let results = [];
        const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
        const ddgData = await ddgRes.json();
        if (ddgData.AbstractText) results.push(`[DuckDuckGo]: ${ddgData.AbstractText}`);
        
        const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=3&srsearch=${encodeURIComponent(query)}`);
        const wikiData = await wikiRes.json();
        if (wikiData.query && wikiData.query.search) {
            wikiData.query.search.forEach(s => {
                results.push(`[Wikipedia] ${s.title}: ${s.snippet.replace(/<[^>]+>/g, '')}`);
            });
        }
        return results.length > 0 ? results.join('\n\n') : "No search results found.";
    } catch (e) {
        return "Search failed due to network error.";
    }
}

export async function callAI(message, onActivity) {
    const mem = Memory.load();

    const systemPrompt = `You are QUENTRIX, the personal AI system of Jaylon.
You are an Autonomous Senior Developer and Researcher.

CREATOR PROFILE:
Name: ${mem.profile.preferred_name}
Constraints: ${mem.profile.background}

YOUR DIRECTIVES:
Build the MVP immediately. Never ask "What should I add next?" Just write the complete code.

TOOL USE:
To search the web, output ONLY this exact format:
<tool>{"name": "search", "query": "your search terms here"}</tool>`;

    let fullPrompt = `${systemPrompt}\n\nUser: ${message}`;
    let loopCount = 0;
    
    while (loopCount < 3) {
        try {
            onActivity("Thinking...");
            
            // Using the simple GET endpoint (returns plain text, no JSON parsing needed)
            const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`);
            
            if (!res.ok) throw new Error("Network error");
            
            // We just read the plain text directly. No more crashes!
            let reply = await res.text();

            // Check for Tool Call
            const toolRegex = /<tool>\s*(\{[\s\S]*?\})\s*<\/tool>/;
            const toolMatch = reply.match(toolRegex);

            if (toolMatch) {
                let toolCall;
                try { toolCall = JSON.parse(toolMatch[1]); } catch (e) { toolCall = null; }

                if (toolCall && toolCall.name === "search") {
                    onActivity(`Deep Searching: ${toolCall.query}`);
                    const searchResult = await searchWeb(toolCall.query);
                    
                    // Append the result to our prompt and try again
                    fullPrompt += `\n\nQUENTRIX: ${reply}\n\nSystem: [Search Results]:\n${searchResult}\n\nNow answer the original question using this data. Generate the full code immediately.`;
                    
                    loopCount++;
                    continue; 
                }
            }

            return { response: reply, status: 'ready', capability: 'agent_core' };

        } catch (err) {
            return { response: null, status: 'offline', error: err.message };
        }
    }
    return { response: "I got stuck in a loop.", status: 'error' };
}

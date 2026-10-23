import { state } from './config.js';
import { Memory } from './memory.js';

// --- THE SEARCH TOOL ---
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

// --- THE AGENT LOOP ---
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

    let messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
    ];

    let loopCount = 0;
    
    while (loopCount < 3) {
        try {
            onActivity("Thinking...");
            
            // We use the standard openai endpoint. 
            const res = await fetch("https://text.pollinations.ai/openai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: "openai", messages: messages })
            });
            
            if (!res.ok) throw new Error("Network error: " + res.status);
            const data = await res.json();

            // DEBUGGING: If it fails again, check your browser console to see what this prints.
            console.log("Raw AI Response:", data);

            // 1. Safely extract the text (Prevents the "undefined" crash)
            let reply = "";
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                reply = data.choices[0].message.content;
            } else if (data.error) {
                throw new Error("AI Error: " + (data.error.message || "Rate limited"));
            } else if (typeof data === 'string') {
                reply = data; // Sometimes it just returns a string
            } else {
                throw new Error("The AI returned an empty response. Please try again.");
            }

            // 2. Check for Tool Call
            const toolRegex = /<tool>\s*(\{[\s\S]*?\})\s*<\/tool>/;
            const toolMatch = reply.match(toolRegex);

            if (toolMatch) {
                let toolCall;
                try { toolCall = JSON.parse(toolMatch[1]); } catch (e) { toolCall = null; }

                if (toolCall && toolCall.name === "search") {
                    onActivity(`Deep Searching: ${toolCall.query}`);
                    const searchResult = await searchWeb(toolCall.query);
                    
                    messages.push({ role: "assistant", content: reply });
                    messages.push({ role: "user", content: `[System Tool Result]:\n${searchResult}\n\nNow answer the original question using this data. Generate the full code immediately.` });
                    
                    loopCount++;
                    continue; 
                }
            }

            return {
                response: reply,
                status: 'ready',
                capability: 'agent_core'
            };

        } catch (err) {
            console.error("Brain Error:", err);
            // If it fails, return the error message so the UI shows it
            return { response: null, status: 'offline', error: err.message };
        }
    }
    return { response: "I got stuck in a loop. Please try a simpler prompt.", status: 'error' };
}

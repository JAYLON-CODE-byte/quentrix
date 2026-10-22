import { state } from './config.js';
import { Memory } from './memory.js';

// --- THE SEARCH TOOL (No API Key Required) ---
async function searchWeb(query) {
    try {
        let results = [];
        
        // 1. Search DuckDuckGo
        const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
        const ddgData = await ddgRes.json();
        
        if (ddgData.AbstractText) results.push(`[DuckDuckGo Summary]: ${ddgData.AbstractText}`);
        
        if (ddgData.RelatedTopics) {
            ddgData.RelatedTopics.slice(0, 3).forEach(t => {
                if (t.Text) results.push(`- ${t.Text}`);
            });
        }

        // 2. Search Wikipedia
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
Location: ${mem.profile.location}
Constraints: ${mem.profile.background}

LEARNING STYLE: ${mem.learning_preferences.style}
TONE: ${mem.learning_preferences.tone}

ACTIVE PROJECTS: 
${mem.projects.map(p => `- ${p.name}: ${p.desc}`).join('\n')}

YOUR DIRECTIVES:
1. Understand before acting.
2. Be honest about what you know.
3. Help Jaylon learn, but don't ask him step-by-step what to add. Build the MVP (Minimum Viable Product) immediately.
4. NEVER ask "What should I add next?" Just write the complete code.

TOOL USE:
If you need current information, tutorials, or facts that you don't know, you MUST use the search tool.
To search, output ONLY this exact format:
<tool>{"name": "search", "query": "your search terms here"}</tool>

The system will run the search and give you the results. Then, you can write the final response and code.`;

    let messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
    ];

    let loopCount = 0;
    
    while (loopCount < 3) {
        try {
            onActivity("Thinking...");
            
            const res = await fetch("https://text.pollinations.ai/openai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: "openai", messages: messages })
            });
            
            if (!res.ok) throw new Error("Network error");
            const data = await res.json();
            let reply = data.choices[0].message.content;

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
            return { response: null, status: 'offline', error: err.message };
        }
    }
    return { response: "I got stuck in a loop while searching.", status: 'error' };
}

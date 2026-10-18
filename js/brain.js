// BRAIN: The AI logic and prompt engineering
import { state } from './config.js';
import { Memory } from './memory.js';

export async function callAI(message) {
    // 1. Load memory so the AI knows who it is talking to
    const mem = Memory.load();

    // 2. Build the system prompt (This is hidden from the browser's HTML)
    const styleInstruction = state.responseStyle === 'detailed' 
        ? "Be very detailed, explain everything step-by-step." 
        : state.responseStyle === 'balanced'
        ? "Be balanced. Explain clearly but keep it brief."
        : "Be concise. Give short, direct answers.";

    const systemPrompt = `You are QUENTRIX, Jaylon's personal AI.
PROFILE: ${JSON.stringify(mem.profile)}
PREFERENCES: ${JSON.stringify(mem.preferences)}
STYLE RULE: ${styleInstruction}
Answer this message from Jaylon: ${message}`;

    try {
        // 3. Call Pollinations AI (Frontend Fallback until Python server is ready)
        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(systemPrompt)}`);
        
        if (!res.ok) throw new Error("Network response was not ok");
        
        const text = await res.text();
        
        return {
            response: text,
            status: 'ready',
            capability: 'browser_fallback'
        };
    } catch (err) {
        return {
            response: null,
            status: 'offline',
            error: err.message
        };
    }
}

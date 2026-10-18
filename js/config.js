// CONFIG: The control panel for QUENTRIX
export const CONFIG = {
    // When you build your Python server later, you will change this URL
    // For now, we will use a fallback in brain.js
    chatEndpoint: '/api/chat', 
    researchEndpoint: '/api/research',
    timeoutMs: 25000
};

// STATE: Tracks what the UI is currently doing
export const state = {
    currentView: 'chat',
    isProcessing: false,
    sidebarOpen: false,
    status: 'ready', 
    responseStyle: 'concise',
    reducedMotion: false
};

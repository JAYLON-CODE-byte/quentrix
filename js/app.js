import { CONFIG, state } from './config.js';
import { callAI } from './brain.js';
import { Memory } from './memory.js';

// --- DOM Elements ---
const chatArea = document.getElementById('chatArea');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const viewContainer = document.getElementById('viewContainer');
const activityPanel = document.getElementById('activityPanel');
const activitySteps = document.getElementById('activitySteps');
const headerStatus = document.getElementById('headerStatus');
const headerStatusText = document.getElementById('headerStatusText');
const sidebarStatusDot = document.getElementById('sidebarStatusDot');
const sidebarStatusText = document.getElementById('sidebarStatusText');

const aiAvatarSVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="#00E5FF" stroke-width="1.6"/><circle cx="12" cy="12" r="2" fill="#00E5FF"/></svg>';
const userAvatarSVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="#6D5DFC" stroke-width="1.6"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="#6D5DFC" stroke-width="1.6"/></svg>';

// --- Status & Activity ---
function setStatus(status, label) {
    state.status = status;
    const text = (label || status).toUpperCase();
    headerStatus.dataset.status = status;
    headerStatusText.textContent = text;
    sidebarStatusDot.className = 'status-dot';
    if (status === 'offline' || status === 'error') sidebarStatusDot.classList.add(status);
    else if (status !== 'ready') sidebarStatusDot.classList.add('thinking');

    const sideLabels = { ready: 'Ready', thinking: 'Thinking…', error: 'Error', offline: 'Offline' };
    sidebarStatusText.textContent = sideLabels[status] || text;
}

function showActivity(steps) {
    activitySteps.innerHTML = '';
    steps.forEach((s, i) => {
        const li = document.createElement('li');
        li.textContent = s;
        if (i < steps.length - 1) li.classList.add('done');
        else li.classList.add('current');
        activitySteps.appendChild(li);
    });
    activityPanel.classList.add('visible');
}

function hideActivity() {
    activityPanel.classList.remove('visible');
    activitySteps.innerHTML = '';
}

// --- Chat UI ---
function getTimeString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function scrollChatToBottom() {
    requestAnimationFrame(() => { chatArea.scrollTop = chatArea.scrollHeight; });
}

// --- The Magic Preview Window ---
function openPreview(code) {
    let overlay = document.getElementById('previewOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'previewOverlay';
        overlay.className = 'preview-overlay';
        overlay.innerHTML = `
            <div class="preview-header">
                <span>QUENTRIX PREVIEW</span>
                <button class="close-preview" onclick="document.getElementById('previewOverlay').classList.remove('active')">Close</button>
            </div>
            <iframe class="preview-iframe" id="previewIframe"></iframe>
        `;
        document.body.appendChild(overlay);
    }
    
    const iframe = document.getElementById('previewIframe');
    // This securely runs the HTML inside the iframe
    iframe.srcdoc = code;
    
    overlay.classList.add('active');
}

function addMessage(sender, text, meta) {
    const row = document.createElement('div');
    row.className = 'message ' + sender;
    
    if (sender === 'system') {
        row.innerHTML = `<div class="message-col" style="width:100%"><div class="message-bubble">${escapeHTML(text)}</div></div>`;
    } else {
        const label = sender === 'user' ? 'You' : 'Quentrix';
        const avatar = sender === 'user' ? userAvatarSVG : aiAvatarSVG;
        let metaHtml = meta ? `<span class="message-meta">${escapeHTML(meta)}</span>` : '';
        
        const rawHTML = marked.parse(text);
        
        row.innerHTML = `
            <div class="msg-avatar">${avatar}</div>
            <div class="message-col">
                <span class="message-sender">${label}</span>
                <div class="message-bubble">${rawHTML}</div>
                <span class="message-time">${getTimeString()}</span>
                ${metaHtml}
            </div>`;

        // Process all code blocks
        row.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
            
            // Check if it's HTML (so we know whether to show the Run button)
            const isHTML = block.className.includes('language-html') || block.className.includes('language-xml');
            
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            
            const header = document.createElement('div');
            header.className = 'code-block-header';
            
            // Create buttons
            let btnHTML = `<div class="code-btn-group">`;
            if (isHTML) {
                btnHTML += `<button class="run-btn">▶ Run</button>`;
            }
            btnHTML += `<button class="copy-btn">Copy</button></div>`;
            
            header.innerHTML = `<span>Code</span>${btnHTML}`;
            
            block.parentNode.parentNode.insertBefore(wrapper, block.parentNode);
            wrapper.appendChild(header);
            wrapper.appendChild(block.parentNode);

            // Copy Button Logic
            header.querySelector('.copy-btn').addEventListener('click', (e) => {
                navigator.clipboard.writeText(block.innerText);
                e.target.textContent = 'Copied!';
                setTimeout(() => e.target.textContent = 'Copy', 2000);
            });

            // Run Button Logic
            const runBtn = header.querySelector('.run-btn');
            if (runBtn) {
                runBtn.addEventListener('click', () => {
                    openPreview(block.innerText);
                });
            }
        });
    }
    chatArea.appendChild(row);
    scrollChatToBottom();
}

function showTyping() {
    const el = document.createElement('div');
    el.className = 'typing-indicator';
    el.id = 'typingIndicator';
    el.innerHTML = `<div class="msg-avatar">${aiAvatarSVG}</div><div class="bubble-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
    chatArea.appendChild(el);
    scrollChatToBottom();
}

function removeTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

// --- Core Functions ---
async function sendMessage() {
    if (state.isProcessing) return;
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    chatInput.value = '';
    state.isProcessing = true;
    sendBtn.disabled = true;

    setStatus('thinking', 'Thinking');
    showActivity(['Receiving request', 'Connecting to AI Brain']);
    showTyping();

    const result = await callAI(textconst result = await callAI(text, (activityText) => {
    showActivity(['Receiving request', activityText]);
});
    removeTyping();

    if (result.status === 'ready') {
        setStatus('ready', 'Ready');
        addMessage('ai', result.response, `capability: ${result.capability}`);
        hideActivity();
    } else {
        setStatus('offline', 'Offline');
        addMessage('ai', `Error: ${result.error}. Check your connection.`, 'status: offline');
        setTimeout(hideActivity, 2000);
    }

    state.isProcessing = false;
    sendBtn.disabled = false;
    chatInput.focus();
}

// --- MEMORY RENDERING ---
function renderMemory() {
    const mem = Memory.load();

    const profileDiv = document.getElementById('memProfile');
    if (profileDiv && mem.profile) {
        profileDiv.innerHTML = Object.entries(mem.profile)
            .map(([key, value]) => `<div class="memory-item"><strong style="text-transform:capitalize;">${key.replace(/_/g, ' ')}:</strong> ${value}</div>`)
            .join('');
    }

    const prefDiv = document.getElementById('memPreferences');
    if (prefDiv && mem.learning_preferences) {
        prefDiv.innerHTML = Object.entries(mem.learning_preferences)
            .map(([key, value]) => `<div class="memory-item"><strong style="text-transform:capitalize;">${key}:</strong> ${value}</div>`)
            .join('');
    }

    const projDiv = document.getElementById('memProjects');
    const projListDiv = document.getElementById('projectsList');
    
    if (mem.projects && mem.projects.length > 0) {
        const projectHTML = mem.projects.map(p => `
            <div class="memory-item">
                <strong>${p.name}</strong> <span class="proj-status ${p.status}">${p.status}</span><br>
                <span style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-top:4px;">${p.desc}</span>
            </div>
        `).join('');
        
        if (projDiv) projDiv.innerHTML = projectHTML;
        if (projListDiv) projListDiv.innerHTML = projectHTML;
    }

    const noteDiv = document.getElementById('memKnowledge');
    if (noteDiv && mem.directives) {
        noteDiv.innerHTML = mem.directives
            .map(d => `<div class="memory-item">${d}</div>`)
            .join('');
    }
}

// --- Navigation & UI ---
function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    sidebar.classList.toggle('open', state.sidebarOpen);
    sidebarOverlay.classList.toggle('show', state.sidebarOpen);
}

function closeSidebar() {
    state.sidebarOpen = false;
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
}

function switchView(viewName, navEl) {
    state.currentView = viewName;
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
    else {
        const match = document.querySelector(`.nav-item[data-view="${viewName}"]`);
        if (match) match.classList.add('active');
    }
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.add('active');
    viewContainer.scrollTop = 0;
    
    if (window.innerWidth <= 768) closeSidebar();
    if (viewName === 'chat') setTimeout(() => chatInput.focus(), 150);
    
    if (viewName === 'memory' || viewName === 'projects') {
        renderMemory();
    }
}

function toggleSetting(el) {
    el.classList.toggle('on');
    if (el.id === 'toggleMotion') state.reducedMotion = el.classList.contains('on');
}

function setStyle(el) {
    el.parentElement.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    state.responseStyle = el.dataset.style || 'concise';
}

function handleAttachment() {
    if (state.currentView !== 'chat') switchView('chat');
    addMessage('system', 'File attachment UI is ready. Backend analysis is not connected yet.');
}

function handleVoice() {
    if (state.currentView !== 'chat') switchView('chat');
    addMessage('system', 'Voice input is prepared in the UI but not connected to a recognition backend.');
}

function runResearch() {
    addMessage('system', 'Research requires the Python backend to be connected.');
}

// --- Initialization ---
function init() {
    setStatus('ready', 'Ready');
    chatInput.focus();
    if (window.innerWidth <= 768) closeSidebar();
    renderMemory();
}

// EXPOSE TO WINDOW
window.switchView = switchView;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.handleAttachment = handleAttachment;
window.handleVoice = handleVoice;
window.sendMessage = sendMessage;
window.toggleSetting = toggleSetting;
window.setStyle = setStyle;
window.runResearch = runResearch;

window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && state.sidebarOpen) closeSidebar();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.sidebarOpen) closeSidebar();
});
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

init();

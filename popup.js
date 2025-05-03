// Popup script for Gemini Assistant Extension

// DOM elements
const elements = {
  // Tabs
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Chat tab
  chatMessages: document.getElementById('chatMessages'),
  queryInput: document.getElementById('queryInput'),
  sendQuery: document.getElementById('sendQuery'),
  
  // History tab
  historyContainer: document.getElementById('historyContainer'),
  
  // Settings
  settingsToggle: document.getElementById('settingsToggle'),
  settingsPanel: document.getElementById('settingsPanel'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  modelSelect: document.getElementById('modelSelect'),
  saveSettings: document.getElementById('saveSettings'),
  clearHistory: document.getElementById('clearHistory')
};

// Global variables
let currentSettings = {};
let notificationTimeout = null;

// Default model
const DEFAULT_MODEL = 'gemini-2.0-flash';

// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
  // Load settings
  await loadSettings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load history
  loadHistory();
  
  // Load current selection (if any)
  loadCurrentSelection();
  
  // Listen for selection updates from background
  listenForSelectionUpdates();
  
  // Create notification container if it doesn't exist
  if (!document.getElementById('notification')) {
    const notificationEl = document.createElement('div');
    notificationEl.id = 'notification';
    notificationEl.style.display = 'none';
    notificationEl.style.position = 'fixed';
    notificationEl.style.bottom = '10px';
    notificationEl.style.left = '50%';
    notificationEl.style.transform = 'translateX(-50%)';
    notificationEl.style.backgroundColor = '#4CAF50';
    notificationEl.style.color = 'white';
    notificationEl.style.padding = '10px 20px';
    notificationEl.style.borderRadius = '5px';
    notificationEl.style.zIndex = '1000';
    document.body.appendChild(notificationEl);
  }
  
  // Function to show a notification
  function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Clear any existing timeout
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    
    // Set notification style based on type
    if (type === 'success') {
      notification.style.backgroundColor = '#4CAF50'; // Green
    } else if (type === 'error') {
      notification.style.backgroundColor = '#F44336'; // Red
    }
    
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Hide the notification after 3 seconds
    notificationTimeout = setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }

  // Function to load user settings
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey', 'modelId'], (result) => {
        currentSettings = {
          apiKey: result.apiKey || '',
          modelId: result.modelId || DEFAULT_MODEL
        };
        
        // Update UI with settings
        elements.apiKeyInput.value = currentSettings.apiKey;
        
        // Set model selection
        if (elements.modelSelect) {
          elements.modelSelect.value = currentSettings.modelId;
        }
        
        resolve();
      });
    });
  }

  // Function to load the current text selection
  function loadCurrentSelection() {
    chrome.storage.local.get(['currentSelection'], (data) => {
      if (data.currentSelection && data.currentSelection.text) {
        console.log('[Gemini Assistant] Loading current selection:', 
          data.currentSelection.text.substring(0, 50) + (data.currentSelection.text.length > 50 ? '...' : ''));
        
        // Set the query input to the current selection
        elements.queryInput.value = data.currentSelection.text;
        
        // Clear the badge when selection is loaded
        chrome.action.setBadgeText({ text: '' });
      }
    });
  }

  // Listen for real-time selection updates from background script
  function listenForSelectionUpdates() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'updateSelection' && request.selectedText) {
        console.log('[Gemini Assistant] Received selection update:', 
          request.selectedText.substring(0, 50) + (request.selectedText.length > 50 ? '...' : ''));
        
        // Update the query input with the new selection
        elements.queryInput.value = request.selectedText;
      }
    });
  }

  // Setup event listeners
  function setupEventListeners() {
    // Tab switching
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Chat functionality
    elements.sendQuery.addEventListener('click', sendQuery);
    elements.queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuery();
      }
    });
    
    // Settings functionality
    elements.settingsToggle.addEventListener('click', toggleSettings);
    elements.saveSettings.addEventListener('click', saveSettings);
    elements.clearHistory.addEventListener('click', clearHistory);
  }

  // Switch between tabs
  function switchTab(tabId) {
    // Update tab buttons
    elements.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update tab content
    elements.tabContents.forEach(content => {
      const isActive = content.id === `${tabId}Tab`;
      content.classList.toggle('active', isActive);
    });
  }

  // Send query to Gemini
  async function sendQuery() {
    const query = elements.queryInput.value.trim();
    
    if (!query) return;
    
    // Add user message to chat
    addChatMessage(query, 'user');
    
    // Clear input
    elements.queryInput.value = '';
    
    // Add loading message
    const loadingMessage = addChatMessage('Thinking...', 'assistant');
    
    try {
      // Check if API key is set
      if (!currentSettings.apiKey) {
        updateChatMessage(loadingMessage, 'Please set your Google API key in the settings.', 'assistant');
        toggleSettings();
        return;
      }
      
      // Send query to background script
      const response = await chrome.runtime.sendMessage({
        action: 'processQuery',
        query: query,
        modelId: currentSettings.modelId
      });
      
      console.log('[Gemini Assistant] Response:', response);
      
      // Extract response text
      let responseText;
      if (response && response.response && response.response.candidates && 
          response.response.candidates[0] && response.response.candidates[0].content) {
        responseText = response.response.candidates[0].content.parts[0].text || 'No response from Gemini.';
      } else {
        responseText = 'Received an unexpected response format from Gemini.';
      }
      
      updateChatMessage(loadingMessage, responseText, 'assistant');
      
    } catch (error) {
      console.error('Error sending query:', error);
      updateChatMessage(loadingMessage, `Error: ${error.message}`, 'assistant');
    }
  }

  // Add message to chat
  function addChatMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    messageElement.textContent = text;
    elements.chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    return messageElement;
  }

  // Update existing chat message
  function updateChatMessage(messageElement, text, sender) {
    messageElement.textContent = text;
    messageElement.className = `chat-message ${sender}-message`;
    
    // Scroll to bottom
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  // Toggle settings panel
  function toggleSettings() {
    elements.settingsPanel.classList.toggle('active');
  }

  // Save user settings
  async function saveSettings() {
    try {
      const newSettings = {
        apiKey: elements.apiKeyInput.value.trim(),
        modelId: elements.modelSelect.value
      };
      
      // Save to storage
      await chrome.storage.local.set(newSettings);
      
      // Update current settings
      currentSettings = newSettings;
      
      // Show custom notification instead of alert
      showNotification('Settings saved successfully!', 'success');
      
      // Close settings panel
      elements.settingsPanel.classList.remove('active');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Error saving settings: ' + error.message, 'error');
    }
  }

  // Clear conversation history
  async function clearHistory() {
    try {
      await chrome.storage.local.set({ history: [] });
      loadHistory();
      showNotification('History cleared successfully!', 'success');
    } catch (error) {
      console.error('Error clearing history:', error);
      showNotification('Error clearing history: ' + error.message, 'error');
    }
  }

  // Load conversation history
  function loadHistory() {
    chrome.storage.local.get(['history'], (result) => {
      const history = result.history || [];
      
      if (history.length === 0) {
        elements.historyContainer.innerHTML = '<p class="empty-history">No history yet. Your conversations will appear here.</p>';
        return;
      }
      
      elements.historyContainer.innerHTML = '';
      
      history.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        historyItem.dataset.index = index;
        
        const query = document.createElement('div');
        query.classList.add('history-query');
        query.textContent = item.query.substring(0, 50) + (item.query.length > 50 ? '...' : '');
        
        const timestamp = document.createElement('div');
        timestamp.classList.add('history-timestamp');
        timestamp.textContent = new Date(item.timestamp).toLocaleString();
        
        historyItem.appendChild(query);
        historyItem.appendChild(timestamp);
        
        // Add click event to load conversation
        historyItem.addEventListener('click', () => loadConversation(index));
        
        elements.historyContainer.appendChild(historyItem);
      });
    });
  }

  // Load a conversation from history
  function loadConversation(index) {
    chrome.storage.local.get(['history'], (result) => {
      const history = result.history || [];
      
      if (index >= history.length) return;
      
      const item = history[index];
      
      // Switch to chat tab
      switchTab('chat');
      
      // Clear existing messages
      elements.chatMessages.innerHTML = '';
      
      // Add the messages
      addChatMessage(item.query, 'user');
      
      let responseText = '';
      if (item.response.candidates && item.response.candidates[0] && item.response.candidates[0].content) {
        responseText = item.response.candidates[0].content.parts[0].text || 'No response from Gemini.';
      } else {
        responseText = 'Received an unexpected response format from Gemini.';
      }
      
      addChatMessage(responseText, 'assistant');
    });
  }
});

// Background script for Gemini Assistant Extension

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Gemini Assistant Extension installed');
  
  // Initialize context menu
  chrome.contextMenus.create({
    id: 'askGeminiSelectedText',
    title: 'Ask Gemini Assistant about this selection',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'askGeminiAboutPage',
    title: 'Ask Gemini Assistant about this page',
    contexts: ['page']
  });
  
  // Initialize storage with default settings
  chrome.storage.local.set({
    apiKey: '',
    modelId: 'gemini-2.0-flash',
    history: [],
    currentSelection: { text: '', timestamp: '' }
  });
});

// Function to ensure content script is loaded before sending messages
function ensureContentScriptLoaded(tabId) {
  return new Promise((resolve, reject) => {
    // First check if we can communicate with the content script
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
      if (chrome.runtime.lastError) {
        console.log('Content script not yet loaded, injecting now...');
        
        // Content script not loaded, inject it
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => window.getSelection ? window.getSelection().toString() : '',
        })
        .then(() => {
          console.log('Content script injected successfully');
          // Give it a moment to initialize
          setTimeout(resolve, 100);
        })
        .catch(error => {
          console.error('Failed to inject content script:', error);
          reject(error);
        });
      } else {
        // Content script already loaded
        console.log('Content script already loaded');
        resolve();
      }
    });
  });
}

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('[Gemini Assistant] Context menu clicked:', info, tab);
  
  if (info.menuItemId === 'askGeminiSelectedText') {
    // Get the selected text and process it
    if (info.selectionText) {
      processGeminiQuery(info.selectionText, tab.id);
    }
    return;
  }
  
  if (info.menuItemId === 'askGeminiAboutPage') {
    // Just send a simple query about the current page without extracting content
    const query = `What is this page about? The URL is: ${info.pageUrl}`;
    processGeminiQuery(query, tab.id);
    return;
  }
  
  // If no specific menu item was matched, try to get selected text
  ensureContentScriptLoaded(tab.id).then(() => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection ? window.getSelection().toString() : '',
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.warn('[Gemini Assistant] scripting.executeScript error:', chrome.runtime.lastError.message);
        return;
      }
      
      const selectedText = results && results[0] && results[0].result ? results[0].result.trim() : '';
      if (selectedText) {
        console.log('[Gemini Assistant] Selected text (via scripting):', selectedText);
        processGeminiQuery(selectedText, tab.id);
      } else {
        // No selection, send a generic query about the page
        const query = `What is this page about? The URL is: ${info.pageUrl}`;
        processGeminiQuery(query, tab.id);
      }
    });
  });
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processQuery') {
    processGeminiQuery(request.query, sender.tab ? sender.tab.id : null)
      .then(response => sendResponse({ success: true, response }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true; // Required for async sendResponse
  }
  else if (request.action === 'selectionChanged' && request.selectedText) {
    console.log('[Gemini Assistant] Selection changed event received:', 
      request.selectedText.substring(0, 50) + (request.selectedText.length > 50 ? '...' : ''));
    
    // Store the current selection
    chrome.storage.local.set({
      currentSelection: {
        text: request.selectedText,
        timestamp: request.timestamp,
        source: 'text'
      }
    });
    
    // Set a badge to indicate new selection
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#4688F1' });
    
    // Notify any open popup about the selection change
    chrome.runtime.sendMessage({
      action: 'updateSelection',
      selectedText: request.selectedText,
      timestamp: request.timestamp,
      source: 'text'
    }).catch(error => {
      // It's normal for this to fail if popup isn't open
      console.log('[Gemini Assistant] No popup listening for updates');
    });
    
    return true;
  }
  else if (request.action === 'getCurrentSelection') {
    chrome.storage.local.get(['currentSelection'], (data) => {
      sendResponse({ 
        success: true, 
        selection: data.currentSelection || { text: '', timestamp: '', source: '' }
      });
    });
    return true;
  }
});

// Function to process queries with Gemini 2.0 Flash
async function processGeminiQuery(query, tabId) {
  try {
    // Get API key and model ID from storage
    const { apiKey, modelId } = await new Promise(resolve => {
      chrome.storage.local.get(['apiKey', 'modelId'], resolve);
    });
    
    if (!apiKey) {
      return { error: 'API key not set. Please set your Google API key in the extension settings.' };
    }
    
    // Use the selected Gemini model
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: query }]
          }]
        })
      }
    );
    
    const result = await response.json();
    
    if (result.error) {
      return { error: result.error.message || 'Error calling Gemini API' };
    }
    
    saveToHistory(query, result);
    return result;
  } catch (error) {
    console.error('Error processing Gemini query:', error);
    return { error: error.toString() };
  }
}

// Save query and response to history
function saveToHistory(query, response) {
  chrome.storage.local.get(['history'], (result) => {
    let history = result.history || [];
    history.unshift({
      query,
      response,
      timestamp: new Date().toISOString()
    });
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    chrome.storage.local.set({ history });
  });
}

// Content script for Gemini Assistant Extension

// Track the current selection
let currentSelection = '';
let lastRightClickedImage = null;

// Log that content script has loaded
console.log('[Gemini Assistant] Content script loaded');

// Initialize message listeners
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Respond to ping to indicate content script is loaded
  if (request.action === 'ping') {
    console.log('[Gemini Assistant] Received ping, responding with pong');
    sendResponse({ status: 'pong' });
    return true;
  }
  
  if (request.action === 'getSelectedText') {
    let selectedText = '';
    if (window.getSelection) {
      selectedText = window.getSelection().toString();
    }
    sendResponse({ 
      selectedText: selectedText,
      timestamp: new Date().toISOString()
    });
    return true;
  } else if (request.action === 'getLastRightClickedImage') {
    if (lastRightClickedImage) {
      sendResponse({
        success: true,
        imageSrc: lastRightClickedImage.src,
        timestamp: new Date().toISOString()
      });
    } else {
      sendResponse({
        success: false,
        error: 'No image was right-clicked'
      });
    }
    return true;
  }
});

// Track right-clicked images
document.addEventListener('contextmenu', function(e) {
  if (e.target.tagName === 'IMG') {
    console.log('[Gemini Assistant] Image right-clicked:', e.target.src);
    lastRightClickedImage = e.target;
    
    // Send message to background script about the right-clicked image
    chrome.runtime.sendMessage({
      action: 'imageRightClicked',
      imageSrc: e.target.src,
      timestamp: new Date().toISOString()
    });
  } else {
    // Clear last right-clicked image if clicking elsewhere
    lastRightClickedImage = null;
  }
});

// Listen for selection changes on the page
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (selection) {
    const text = selection.toString().trim();
    
    // Only send updates when the selection actually changes and is not empty
    if (text !== currentSelection && text !== '') {
      currentSelection = text;
      console.log('[Gemini Assistant] Selection changed:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
      
      // Notify background script about the selection change
      chrome.runtime.sendMessage({
        action: 'selectionChanged',
        selectedText: text,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Also check for selection on mouseup for better UX
document.addEventListener('mouseup', () => {
  // Wait a small amount of time to ensure the selection is complete
  setTimeout(() => {
    const selection = window.getSelection();
    if (selection) {
      const text = selection.toString().trim();
      
      // Only send updates when selection is not empty and is different
      if (text !== '' && text !== currentSelection) {
        currentSelection = text;
        console.log('[Gemini Assistant] Selection on mouseup:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
        
        // Notify background script about the selection change
        chrome.runtime.sendMessage({
          action: 'selectionChanged',
          selectedText: text,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, 50); // Small delay to ensure selection is complete
});

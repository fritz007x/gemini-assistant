# Gemini Assistant Chrome Extension

A Chrome extension that integrates Google Gemini LLM as an assistant with RAG (Retrieval-Augmented Generation) and OCR (Optical Character Recognition) capabilities.

## Features

- **Google Gemini Integration**: Access Google's Gemini LLM directly from your browser
- **OCR Capabilities**: Extract text from images and PDF documents on webpages
- **RAG System**: Enhance responses with context from the current page
- **Conversation History**: Track and revisit your previous conversations
- **Custom Settings**: Configure API keys and model preferences

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your browser toolbar

## Setup

1. Click on the extension icon to open the popup
2. Go to Settings (gear icon)
3. Enter your Google API key ([Get a key from Google AI Studio](https://aistudio.google.com/app/apikey))
4. Choose your preferred Gemini model
5. Configure other settings as needed
6. Click "Save Settings"

## Usage

### Chat with Gemini

1. Click on the extension icon
2. Type your query in the text box
3. Press "Send" or hit Enter

### Extract Text from Images (OCR)

1. Click on the extension icon
2. Switch to the "OCR" tab
3. Either:
   - Click "Capture Screen" to capture the current viewport
   - Click "Select Image" to choose an image file
4. Wait for the OCR processing to complete
5. View the extracted text in the results area
6. Optionally, click "Use This Text" to send it to the chat

### Context Menu

Right-click on selected text or anywhere on a webpage and choose "Ask Gemini Assistant" to quickly send content to Gemini.

## Technologies Used

- **Tesseract.js**: JavaScript OCR engine for text extraction
- **Google Gemini API**: Large language model for generating responses
- **Chrome Extension APIs**: For browser integration

## Development

### Project Structure

```
gemini-assistant-extension/
├── manifest.json        # Extension configuration
├── popup.html           # Extension popup UI
├── popup.css            # Styles for the popup
├── popup.js             # Popup functionality
├── background.js        # Background script
├── content.js           # Content script
└── icons/               # Extension icons
```

### Dependencies

- Tesseract.js for OCR capabilities
- No other external dependencies are required as everything runs within the Chrome extension environment

## Privacy

This extension processes content locally where possible. API calls to Google's Gemini are made directly from your browser with your own API key. Your conversations are stored locally in your browser's storage and are not sent to any third-party servers.

## License

MIT

## Acknowledgements

- [Google Gemini](https://ai.google.dev/)
- [Tesseract.js](https://github.com/naptha/tesseract.js)
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)

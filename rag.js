// RAG (Retrieval-Augmented Generation) utilities for Gemini Assistant

class RAGSystem {
  constructor() {
    this.documents = [];
    this.index = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the RAG system
   */
  async initialize() {
    // In a full implementation, we would load a proper vector embedding model here
    // For demonstration purposes, we're using a simple term frequency approach
    this.initialized = true;
    console.log('RAG system initialized');
    return this.initialized;
  }
  
  /**
   * Add a document to the RAG system
   * @param {Object} document - Document object with id, text, and metadata
   */
  addDocument(document) {
    if (!document.id || !document.text) {
      console.error('Document must have id and text properties');
      return false;
    }
    
    // Create document vector (simple term frequency in this implementation)
    const vector = this._createSimpleVector(document.text);
    
    // Add to documents collection
    this.documents.push({
      id: document.id,
      text: document.text,
      vector: vector,
      metadata: document.metadata || {}
    });
    
    return true;
  }
  
  /**
   * Retrieve relevant documents for a query
   * @param {string} query - The query text
   * @param {number} topK - Number of documents to retrieve
   * @returns {Array} - Array of relevant documents
   */
  retrieveRelevantDocuments(query, topK = 3) {
    if (!this.initialized || this.documents.length === 0) {
      return [];
    }
    
    // Create query vector
    const queryVector = this._createSimpleVector(query);
    
    // Calculate similarity with all documents
    const similarities = this.documents.map(doc => ({
      document: doc,
      similarity: this._calculateCosineSimilarity(queryVector, doc.vector)
    }));
    
    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top K documents
    return similarities.slice(0, topK).map(item => ({
      id: item.document.id,
      text: item.document.text,
      metadata: item.document.metadata,
      similarity: item.similarity
    }));
  }
  
  /**
   * Clear all documents in the RAG system
   */
  clearDocuments() {
    this.documents = [];
  }
  
  /**
   * Create a simple term frequency vector for text
   * @param {string} text - Input text
   * @returns {Object} - Term frequency vector
   * @private
   */
  _createSimpleVector(text) {
    // Normalize and tokenize text
    const tokens = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 1);
    
    // Create term frequency map
    const vector = {};
    for (const token of tokens) {
      vector[token] = (vector[token] || 0) + 1;
    }
    
    return vector;
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param {Object} vector1 - First vector
   * @param {Object} vector2 - Second vector
   * @returns {number} - Cosine similarity (0-1)
   * @private
   */
  _calculateCosineSimilarity(vector1, vector2) {
    // Get all unique terms
    const terms = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
    
    // Calculate dot product
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (const term of terms) {
      const v1 = vector1[term] || 0;
      const v2 = vector2[term] || 0;
      
      dotProduct += v1 * v2;
      magnitude1 += v1 * v1;
      magnitude2 += v2 * v2;
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    // Avoid division by zero
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
  }
}

// Export the RAG system
const ragSystem = new RAGSystem();

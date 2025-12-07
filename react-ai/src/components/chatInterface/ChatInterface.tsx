import React, { useState, useCallback, useRef, useEffect, type FormEvent } from 'react';
import { marked } from 'marked';
import { Send, MessageSquare, CornerDownLeft, X, Maximize, Minimize, Paperclip } from 'lucide-react';

// Define the shape of a chat message
interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string; // Markdown content
}

// --- CONFIGURATION ---
const PROXY_API_URL = 'http://localhost:3000/api/generate';
const MODEL_NAME = 'llama2:latest'; // Your installed Ollama model

const ChatInterface: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false); 
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the latest message whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Function to convert Markdown to HTML (and render safely)
  const renderMarkdown = (markdown: string): { __html: string } => {
    return { __html: marked(markdown) as string };
  };

  const handleSendMessage = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), role: 'user', content: input };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(PROXY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          prompt: input,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response.trim(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error('LLM API Error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `**Error:** Failed to get a response from the LLM. Please check your Node.js console.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    // Add system message about upload
    const uploadMessage: Message = {
      id: Date.now(),
      role: 'assistant',
      content: `📎 Uploading **${file.name}**...`,
    };
    setMessages((prev) => [...prev, uploadMessage]);

    try {
      const response = await fetch('http://localhost:3000/api/ingest-sheet', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // Success message
      const successMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `✅ **${data.filename}** uploaded successfully! (${data.chunks} chunks ingested)\n\nYou can now ask questions about the file.`,
      };
      setMessages((prev) => [...prev.slice(0, -1), successMessage]);
      setUploadedFiles((prev) => [...prev, data.filename]);

    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ Failed to upload **${file.name}**. Please try again.`,
      };
      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Toggle function for the chat box
  const toggleChat = () => {
    setIsOpen(!isOpen);
    // When closing the chat via the floating button, we ensure it's not maximized for the next open.
    if (isOpen) {
        setIsMaximized(false); 
    }
  };

  // Toggle function for maximizing/minimizing the chat box size
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const chatBoxClasses = isMaximized
    ? 'top-0 left-0 w-full h-full max-w-full max-h-full rounded-none' // Full Screen
    : 'bottom-10 right-4 w-full max-w-lg h-[80vh] max-h-[600px]'; // Normal Size (~512px)

  return (
    <>
      {/* FLOATING CHAT BUTTON: 
        We only show this button when the chat modal is NOT open.
      */}
      {!isOpen && ( // <--- CONDITIONAL RENDERING ADDED HERE
        <button
          onClick={toggleChat}
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300`}
          aria-label={'Open Chat'}
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Box Interface */}
      <div
        className={`fixed z-40 bg-white shadow-2xl flex flex-col transition-all duration-330 ease-in-out border border-gray-200 ${chatBoxClasses} ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 rounded-t-lg flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Local LLM Chat 🧠</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{MODEL_NAME}</span>
            {/* Maximize/Minimize Button */}
            <button
              onClick={toggleMaximize}
              className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={isMaximized ? 'Minimize Chat' : 'Maximize Chat'}
            >
              {isMaximized ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            {/* Close Button (Now closes the open modal) */}
            <button
              onClick={toggleChat}
              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
              aria-label="Close Chat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages Display Area (remains the same) */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              Start a conversation with your local **{MODEL_NAME}** model.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl shadow-md ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                  }`}
                >
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={renderMarkdown(message.content)} />
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-xl bg-white text-gray-500 border border-gray-200">
                <span className="animate-pulse">Typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area with File Upload */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
          {/* File Upload Display */}
          {uploadedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {uploadedFiles.map((filename, idx) => (
                <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  📎 {filename}
                </span>
              ))}
            </div>
          )}
          
          {/* Input Row */}
          <div className="flex gap-2">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls,.docx,.txt"
              className="hidden"
            />
            
            {/* File Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors duration-150"
              aria-label="Upload File"
            >
              <Paperclip size={20} />
            </button>
            
            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Send a message..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors duration-150"
              aria-label="Send Query"
            >
              {isLoading ? <CornerDownLeft size={20} /> : <Send size={20} />}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatInterface;
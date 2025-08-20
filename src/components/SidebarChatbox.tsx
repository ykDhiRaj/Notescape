'use client';

import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import ChatMessage from './ChatMessage';
import { useAuth } from '@clerk/nextjs';

type ChatMessageItem = { role: 'user' | 'assistant'; content: string };

type SidebarChatbotProps = {
	onAddToCanvas?: (textObject: unknown) => void;
	isDemo: boolean;
	messages: ChatMessageItem[];
	setMessages: Dispatch<SetStateAction<ChatMessageItem[]>>;
	input: string;
	setInput: Dispatch<SetStateAction<string>>;
	loading: boolean;
	setLoading: Dispatch<SetStateAction<boolean>>;
};

export default function SidebarChatbot({ 
  onAddToCanvas, 
  isDemo, 
  messages, 
  setMessages, 
  input, 
  setInput, 
  loading, 
  setLoading 
}: SidebarChatbotProps) {
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const { getToken, isSignedIn } = useAuth();
  
  // Global selection detection
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (!text) {
        setHasSelection(false);
        setSelectedText('');
        return;
      }

      if (!selection || selection.rangeCount === 0) {
        setHasSelection(false);
        setSelectedText('');
        return;
      }

      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      const startElement: Element | null =
        ancestor.nodeType === Node.ELEMENT_NODE
          ? (ancestor as Element)
          : (ancestor.parentElement);

      let el: Element | null = startElement;
      while (el && !el.classList.contains('max-w-2xl')) {
        el = el.parentElement;
      }

      if (el?.classList.contains('ml-auto')) {
        setHasSelection(false);
        setSelectedText('');
        return;
      }

      if (el && (el.classList.contains('mr-auto') || el.classList.contains('max-w-2xl'))) {
        setHasSelection(true);
        setSelectedText(text);
      } else {
        setHasSelection(false);
        setSelectedText('');
      }
    };

    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 50);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const sendMessage = async () => {
  if (isDemo) {
    alert("Login to use this feature");
    return;
  }
  if (!input.trim()) return;

  const userMessage: ChatMessageItem = { role: 'user', content: input };
  setMessages((prev: ChatMessageItem[]) => [...prev, userMessage]);
  setInput("");
  setLoading(true);

  try {
    const token = isSignedIn ? await getToken() : null;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        messages: [...messages, userMessage],
      }),
    });

    const data = await res.json();

    if (!data.success) {
      // gracefully show assistant "error message"
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.error || "Something went wrong. Try again later." },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Chat error:', error.message);
    } else {
      console.error('Chat error:', error);
    }
    setMessages((prev: ChatMessageItem[]) => [
      ...prev,
      { role: 'assistant', content: 'Unexpected error. Please try again later.' },
    ]);
  } finally {
    setLoading(false);
  }
};


  // Rest of your component code stays the same...
  const handleAddToCanvas = (textObject: unknown) => {
    onAddToCanvas?.(textObject);
  };

  const handleAddSelectedFromHeader = () => {
    if (!selectedText) {
      alert('Please select some text to add');
      return;
    }
    if (!window.fabric) {
      alert('Canvas not ready. Please try again.');
      return;
    }

    const textObject = new window.fabric.Textbox(selectedText, {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: '#000000',
      editable: true,
      selectable: true,
      fontFamily: 'Inter, system-ui, sans-serif',
      width: 300,
      splitByGrapheme: true,
    });

    // erasable is not in TS types; set after creation
    (textObject as unknown as { erasable?: boolean }).erasable = false;

    handleAddToCanvas(textObject);
    window.getSelection()?.removeAllRanges();
    setHasSelection(false);
    setSelectedText('');
  };

  return (
    <div className="w-full md:w-[400px] lg:w-[550px] h-full bg-zinc-950 text-zinc-100 flex flex-col border-l border-zinc-800">
      {/* Header */}
      <div className="shrink-0 p-6 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
          <h3 className="text-lg font-medium text-zinc-50">Notescape Assistant</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-4">Your AI-powered note helper</p>

        {hasSelection && (
          <button
            onClick={handleAddSelectedFromHeader}
            className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 
                       border border-zinc-700 text-zinc-200 text-sm font-medium rounded-md 
                       transition-colors duration-200 focus:outline-none focus:ring-2 
                       focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Selected Text
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm">Start a conversation to get help with your notes</p>
          </div>
        )}

        {messages.map((m: ChatMessageItem, i: number) => (
          <ChatMessage
            key={i}
            text={m.content}
            isUser={m.role === 'user'}
            onAddToCanvas={m.role === 'assistant' ? handleAddToCanvas : undefined}
          />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <span className="text-sm text-zinc-400 ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-4 border-t border-zinc-800 bg-zinc-950">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2.5 text-sm 
                         text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 
                         focus:ring-zinc-600 focus:border-transparent transition-all duration-200"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 
                       disabled:text-zinc-600 border border-zinc-700 disabled:border-zinc-800
                       text-zinc-200 text-sm font-medium rounded-md transition-all duration-200 
                       focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 
                       focus:ring-offset-zinc-950 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
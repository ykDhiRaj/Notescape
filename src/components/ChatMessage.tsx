import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ChatMessageProps {
  text: string;
  isUser: boolean;
  onAddToCanvas?: (content: string) => void;
}

export default function ChatMessage({ text, isUser }: ChatMessageProps) {
  // Pass 1: Inline math symbols like \beta
  let processedText = text.replace(
    /(?<!\\$)(\\[a-zA-Z]+(?:[a-zA-Z0-9]+)?(?:\{.*?\})?)(?!\$)/g,
    (_: string, formula: string) => `$${formula}$`
  );

  // Pass 2: If entire formula is inside parentheses, make it block math
  processedText = processedText.replace(
    /\(\s*(\\[a-zA-Z]+(?:\{.*?\})?)\s*\)/g,
    (_: string, formula: string) => `$$${formula.trim()}$$`
  );

  return (
    <div
      className={`max-w-2xl rounded-xl p-4 my-2 select-text ${
        isUser
          ? "bg-neutral-800 ml-auto text-right"
          : "bg-neutral-900 mr-auto text-left"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table: ({ ...props }) => (
            <table
              className="border-collapse border border-gray-300"
              {...props}
            />
          ),
          th: ({ ...props }) => (
            <th
              className="border border-gray-300 bg-gray-700 text-white px-2 py-1 font-semibold"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td className="border border-gray-300 px-2 py-1" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-3 leading-relaxed" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="mb-4 list-disc pl-6 space-y-1" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="mb-4 list-decimal pl-6 space-y-1" {...props} />
          ),
          li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
}
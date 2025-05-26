"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  content: string;
}

export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-white mb-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-white mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-white mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-gray-200 mb-2 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-3 text-gray-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-200">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-gray-200">{children}</li>,
          strong: ({ children }) => (
            <strong className="text-white font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-primary-400">{children}</em>
          ),
          code: ({ children }) => (
            <code className="bg-dark-bg px-1.5 py-0.5 rounded text-primary-400 text-sm font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-dark-bg p-3 rounded-lg border border-dark-border overflow-x-auto mb-3">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-500/10 rounded-r mb-3">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 underline"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="border-dark-border my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

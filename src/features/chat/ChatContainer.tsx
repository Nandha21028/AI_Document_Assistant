import React, { useRef, useEffect, useState } from 'react';
import { ChatMessageItem } from './ChatMessageItem';
import { Trash2, MessageSquare, ShieldCheck } from 'lucide-react';
import type { ChatMessage, SourceReference, DocumentRecord } from '../sessions/types';
import { ConfirmModal } from '../../components/ConfirmModal';

interface ChatContainerProps {
  messages: ChatMessage[];
  document: DocumentRecord | null;
  onClearChat: () => void;
  onSelectSource?: (source: SourceReference) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  document,
  onClearChat,
  onSelectSource,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isClearChatConfirmOpen, setIsClearChatConfirmOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto my-auto animate-message-entrance">
            <div className="p-3.5 rounded-2xl skeuo-card bg-chat-card text-chat-accent shadow-md">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-chat-text tracking-tight">
                Ready to converse with {document ? document.name : 'your document'}
              </h3>
              <p className="text-xs text-chat-muted leading-relaxed">
                Ask questions regarding summaries, metrics, key findings, and data tables. The assistant synthesizes verified grounded answers directly in your browser.
              </p>
            </div>
            <div className="pt-1 flex items-center space-x-2 text-xs text-chat-accent skeuo-pill px-3 py-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Strict Anti-Hallucination Grounding</span>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex justify-end px-2">
              <button
                onClick={() => setIsClearChatConfirmOpen(true)}
                className="skeuo-btn flex items-center space-x-1.5 text-xs text-chat-muted hover:text-rose-400 px-2.5 py-1"
                title="Clear conversation history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear chat</span>
              </button>
            </div>

            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                onSelectSource={onSelectSource}
              />
            ))}

            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* Professional Clear Chat Confirmation */}
      <ConfirmModal
        isOpen={isClearChatConfirmOpen}
        title="Clear Conversation History"
        message="Are you sure you want to clear all messages in this workspace? Your document and its vector embeddings will remain intact."
        confirmLabel="Clear Messages"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          setIsClearChatConfirmOpen(false);
          onClearChat();
        }}
        onCancel={() => setIsClearChatConfirmOpen(false)}
      />
    </>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, StopCircle, Lock } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isDisabled: boolean;
  disabledReason?: string;
  isGenerating?: boolean;
  onStopGeneration?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isDisabled,
  disabledReason,
  isGenerating = false,
  onStopGeneration,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isDisabled || isGenerating || !input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 pb-3 sm:pb-4 pt-1 sm:pt-2">
      <div
        className={`relative flex items-end w-full rounded-2xl transition-all shadow-md ${
          isDisabled
            ? 'skeuo-well cursor-not-allowed opacity-80'
            : 'skeuo-well focus-within:border-chat-accent shadow-lg bg-chat-well'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          rows={1}
          placeholder={
            isDisabled
              ? disabledReason || 'Upload a document above to start asking questions...'
              : 'Ask a question about your document...'
          }
          className="w-full py-3 sm:py-3.5 pl-3.5 sm:pl-4 pr-12 bg-transparent text-xs sm:text-sm font-semibold text-chat-text placeholder:text-chat-muted focus:outline-none resize-none max-h-36 sm:max-h-44 overflow-y-auto leading-relaxed font-sans"
        />

        <div className="absolute right-2 bottom-2">
          {isGenerating ? (
            <button
              onClick={onStopGeneration}
              className="skeuo-btn p-2 rounded-xl text-rose-500 hover:text-rose-400 border border-rose-500 shadow-sm transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Stop Generation"
              aria-label="Stop Generation"
            >
              <StopCircle className="w-4 h-4 animate-pulse" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isDisabled || !input.trim()}
              className={`p-2 rounded-xl transition-all shadow-sm min-h-[40px] min-w-[40px] flex items-center justify-center ${
                isDisabled || !input.trim()
                  ? 'skeuo-btn text-chat-muted opacity-50 cursor-not-allowed'
                  : 'skeuo-btn-primary active:scale-95'
              }`}
              title={isDisabled ? disabledReason : 'Send question'}
              aria-label="Send Question"
            >
              {isDisabled ? <Lock className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-chat-muted font-mono">
        <span className="flex items-center space-x-1.5 font-bold">
          <span className="skeuo-led skeuo-led-green" />
          <span>Grounded on document chunks</span>
        </span>
        <span className="font-bold hidden sm:inline">Local inference • Zero cloud egress</span>
      </div>
    </div>
  );
};

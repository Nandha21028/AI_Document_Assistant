import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, AlertCircle, Sparkles, FileType } from 'lucide-react';

interface DocumentDropzoneProps {
  onFileSelect: (file: File) => void;
  onAttachSample: () => void;
  isParsing: boolean;
  parsingProgress?: { currentPage: number; totalPages: number; status: string } | null;
  errorMessage?: string | null;
}

export const DocumentDropzone: React.FC<DocumentDropzoneProps> = ({
  onFileSelect,
  onAttachSample,
  isParsing,
  parsingProgress,
  errorMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown,.csv,.tsv,.xlsx,.xls,.xlsm,.json,text/plain,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Dropzone Well */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          handleDrop(e);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileSelect(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => !isParsing && fileInputRef.current?.click()}
        className={`relative skeuo-well p-8 sm:p-12 text-center transition-all cursor-pointer select-none border-2 border-dashed ${
          isDragOver
            ? 'border-chat-accent bg-chat-well scale-[1.01] shadow-lg'
            : 'border-chat-border hover:border-chat-accent bg-chat-well/80'
        } ${isParsing ? 'pointer-events-none opacity-90' : ''}`}
      >
        <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
          {/* Icon */}
          <div
            className={`p-4 rounded-2xl skeuo-btn transition-transform shadow-md ${
              isDragOver
                ? 'bg-chat-accent text-white scale-110'
                : 'text-chat-accent'
            }`}
          >
            {isParsing ? (
              <Loader2 className="w-10 h-10 animate-spin text-chat-accent" />
            ) : (
              <UploadCloud className="w-10 h-10 text-chat-accent" />
            )}
          </div>

          {/* Text Instructions / Progress */}
          {isParsing ? (
            <div className="space-y-3 w-full">
              <h3 className="text-base font-extrabold text-chat-text flex items-center justify-center space-x-2">
                <span className="skeuo-led skeuo-led-green animate-pulse-glow" />
                <span>Parsing Document In-Browser</span>
              </h3>
              <p className="text-xs text-chat-accent font-bold font-mono">
                {parsingProgress?.status || 'Reading binary stream...'}
              </p>
              {parsingProgress && parsingProgress.totalPages > 1 && (
                <div className="w-full bg-chat-card rounded-full h-2.5 overflow-hidden border border-chat-border mt-2 shadow-inner">
                  <div
                    className="bg-chat-accent h-full transition-all duration-200 shimmer-bar"
                    style={{
                      width: `${(parsingProgress.currentPage / parsingProgress.totalPages) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-lg font-black text-chat-text tracking-tight">
                Upload Primary Document
              </h3>
              <p className="text-sm text-chat-muted font-medium leading-relaxed">
                Drag &amp; drop your <strong className="text-chat-text font-bold">PDF, Excel (.xlsx/.xls), CSV, or Markdown</strong> file here, or{' '}
                <span className="text-chat-accent font-bold underline cursor-pointer">browse files</span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
                <span className="skeuo-pill px-3 py-1 text-xs font-mono text-chat-text font-bold flex items-center space-x-1.5 shadow-sm">
                  <FileType className="w-3.5 h-3.5 text-chat-accent" />
                  <span>PDF • XLSX • XLS • CSV • MD • TXT</span>
                </span>
                <span className="skeuo-pill px-3 py-1 text-xs font-mono text-chat-text font-bold shadow-sm">
                  Zero Server Upload
                </span>
              </div>
            </div>
          )}

          {/* Sample Document Quick Button */}
          {!isParsing && (
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAttachSample();
                }}
                className="skeuo-btn inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold shadow-md hover:border-chat-accent text-chat-text"
              >
                <Sparkles className="w-4 h-4 text-chat-accent" />
                <span>Load Sample Report (No file needed)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl skeuo-well bg-chat-well border border-rose-500 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-3 animate-message-entrance shadow-md">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-600 dark:text-rose-400">Document Ingestion Error</p>
            <p className="font-medium">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

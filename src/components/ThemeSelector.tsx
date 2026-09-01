import React, { useState, useRef, useEffect } from 'react';
import { Palette, Sparkles, Box, Check, Layers, CircleDot } from 'lucide-react';
import { useTheme, type AppTheme } from '../context/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme, themeOptions } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getStyleIcon = (id: AppTheme, className: string = 'w-3.5 h-3.5') => {
    switch (id) {
      case 'cyber':
        return <Sparkles className={className} />;
      case 'default':
        return <Layers className={className} />;
      case 'dark':
        return <Box className={className} />;
      case 'protective':
        return <CircleDot className={className} />;
    }
  };

  const getThemeLedClass = (id: AppTheme) => {
    switch (id) {
      case 'cyber':
        return 'skeuo-led-cyan animate-pulse-glow';
      case 'default':
        return 'skeuo-led-green';
      case 'dark':
        return 'skeuo-led-green';
      case 'protective':
        return 'skeuo-led-amber';
    }
  };

  const currentOption = themeOptions.find((t) => t.id === theme) || themeOptions[0];

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="skeuo-btn flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1.5 text-xs font-bold"
        title="Switch UI Style & Theme Paradigm"
      >
        <span className={`skeuo-led ${getThemeLedClass(theme)}`} />
        <span className="text-chat-accent">{getStyleIcon(theme, 'w-3.5 h-3.5 text-chat-accent')}</span>
        <span className="text-chat-text font-bold truncate max-w-[90px] sm:max-w-none">{currentOption.badge}</span>
        <Palette className="w-3 h-3 text-chat-muted opacity-80 shrink-0" />
      </button>

      {/* Popover Menu (Mobile-responsive fixed/absolute positioning) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 skeuo-card p-2 shadow-2xl z-50 animate-modal-pop bg-chat-card border border-chat-border max-w-[calc(100vw-1.5rem)]">
          <div className="px-2.5 py-1.5 border-b border-chat-border mb-1 flex items-center justify-between">
            <span className="text-[11px] font-black text-chat-muted uppercase tracking-wider">
              UI Style Paradigms
            </span>
            <span className="text-[10px] font-mono text-chat-accent font-extrabold skeuo-pill px-2 py-0.5">
              4 Design Systems
            </span>
          </div>

          <div className="space-y-1.5">
            {themeOptions.map((opt) => {
              const isSelected = opt.id === theme;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start space-x-2.5 p-2 rounded-xl text-left transition-all text-xs ${
                    isSelected
                      ? 'bg-chat-hover text-chat-text border border-chat-accent shadow-sm'
                      : 'text-chat-muted hover:bg-chat-hover hover:text-chat-text border border-transparent'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-chat-accent text-chat-accentText'
                        : 'bg-chat-well text-chat-muted'
                    }`}
                  >
                    {getStyleIcon(opt.id, 'w-4 h-4')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-bold text-chat-text truncate">
                          {opt.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-chat-accent skeuo-pill px-1.5 py-0.2 shrink-0">
                          {opt.badge}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-chat-accent shrink-0 ml-1" />
                      )}
                    </div>
                    <p className="text-[10px] text-chat-muted leading-tight mt-0.5 line-clamp-2 font-sans">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

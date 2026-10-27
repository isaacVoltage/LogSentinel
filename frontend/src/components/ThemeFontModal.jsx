import React from 'react';
import { X, Palette, Sparkles } from 'lucide-react';
import ThemeFontCustomizer from './ThemeFontCustomizer';

export default function ThemeFontModal({
  isOpen,
  onClose,
  currentTheme,
  currentSans,
  currentMono,
  currentSize,
  currentWeight,
  onChangeTheme,
  onChangeSans,
  onChangeMono,
  onChangeSize,
  onChangeWeight,
  onResetDefaults
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-3xl max-h-[90vh] rounded-2xl border border-cyber-blue/30 overflow-hidden shadow-2xl flex flex-col relative bg-dark-900/95">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-dark-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyber-blue/20 to-cyber-purple/20 border border-cyber-blue/40 text-cyber-blue">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Theme & Font Customizer</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/30 font-normal">
                  Live Preview
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Personalize dashboard visual themes, light modes, UI fonts, and terminal monospace styles.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition-all"
            title="Close Customizer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <ThemeFontCustomizer
            currentTheme={currentTheme}
            currentSans={currentSans}
            currentMono={currentMono}
            currentSize={currentSize}
            currentWeight={currentWeight}
            onChangeTheme={onChangeTheme}
            onChangeSans={onChangeSans}
            onChangeMono={onChangeMono}
            onChangeSize={onChangeSize}
            onChangeWeight={onChangeWeight}
            onResetDefaults={onResetDefaults}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-gray-800 bg-dark-950/80 flex items-center justify-between shrink-0">
          <div className="text-xs font-mono text-gray-400">
            Changes are saved automatically and applied system-wide.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyber-blue text-dark-900 font-mono text-xs font-bold hover:bg-cyan-400 transition-all shadow-md shadow-cyber-blue/20"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}

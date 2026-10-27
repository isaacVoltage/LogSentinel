import React, { useState } from 'react';
import { 
  Palette, Type, Sun, Moon, Check, Sparkles, Sliders, 
  RotateCcw, Monitor, Terminal, Shield, Eye
} from 'lucide-react';
import { 
  THEMES, 
  FONT_SANS_OPTIONS, 
  FONT_MONO_OPTIONS, 
  FONT_SIZE_OPTIONS, 
  FONT_WEIGHT_OPTIONS 
} from '../utils/themeConfig';

export default function ThemeFontCustomizer({
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
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'light', 'dark'

  const filteredThemes = THEMES.filter((t) => {
    if (activeTab === 'light') return t.mode === 'light';
    if (activeTab === 'dark') return t.mode === 'dark';
    return true;
  });

  const isCurrentLight = currentTheme.startsWith('light-');

  return (
    <div className="space-y-6">
      {/* 1. Theme Palette Selector Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyber-blue" />
            <h3 className="text-sm font-bold text-white font-mono tracking-wide">
              Visual Color Theme
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-dark-950 p-1 rounded-lg border border-gray-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded transition-all ${
                activeTab === 'all'
                  ? 'bg-cyber-blue text-dark-900 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Themes ({THEMES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('light')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
                activeTab === 'light'
                  ? 'bg-amber-400 text-dark-900 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-500" />
              <span>Light Modes (3)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dark')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
                activeTab === 'dark'
                  ? 'bg-cyber-purple text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Moon className="w-3 h-3 text-cyber-purple" />
              <span>Dark Modes (4)</span>
            </button>
          </div>
        </div>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredThemes.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onChangeTheme(theme.id)}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group ${
                  isSelected
                    ? 'border-cyber-blue bg-cyber-blue/10 shadow-lg shadow-cyber-blue/10 ring-1 ring-cyber-blue'
                    : 'border-gray-800/80 bg-dark-950/60 hover:border-gray-700 hover:bg-dark-950/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block shadow-sm shrink-0 border border-black/20"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        {theme.name}
                        {theme.mode === 'light' ? (
                          <Sun className="w-3 h-3 text-amber-500 inline" />
                        ) : (
                          <Moon className="w-3 h-3 text-indigo-400 inline" />
                        )}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="px-1.5 py-0.5 rounded bg-cyber-blue text-dark-900 font-mono text-[10px] font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 leading-snug line-clamp-2">
                    {theme.description}
                  </p>
                </div>

                {/* Swatches preview & tag */}
                <div className="mt-3 pt-2.5 border-t border-gray-800/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800/80 text-gray-300">
                    {theme.tag}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-black/30"
                      style={{ backgroundColor: theme.primaryColor }}
                      title="Primary Accent"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-black/30"
                      style={{ backgroundColor: theme.secondaryColor }}
                      title="Secondary Accent"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-gray-700"
                      style={{ backgroundColor: theme.bgPreview }}
                      title="Canvas Background"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Typography & Font Customizer Section */}
      <div className="space-y-4 pt-2 border-t border-gray-800/80">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-cyber-purple" />
          <h3 className="text-sm font-bold text-white font-mono tracking-wide">
            Typography & Font Engine
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* UI Sans-Serif Font Selection */}
          <div className="p-3.5 rounded-xl bg-dark-950/60 border border-gray-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <span>UI Sans-Serif Font</span>
              </label>
              <span className="text-[11px] font-mono text-cyber-blue font-semibold">
                {currentSans}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FONT_SANS_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChangeSans(f.id)}
                  style={{ fontFamily: f.family }}
                  className={`p-2.5 rounded-lg border text-left transition-all text-xs flex flex-col justify-between ${
                    currentSans === f.id
                      ? 'border-cyber-blue bg-cyber-blue/15 text-white font-bold shadow-sm'
                      : 'border-gray-800 bg-dark-900/80 text-gray-300 hover:border-gray-700 hover:text-white'
                  }`}
                >
                  <span className="text-xs">{f.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono opacity-80 mt-0.5">
                    {f.preview}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Terminal Monospace Font Selection */}
          <div className="p-3.5 rounded-xl bg-dark-950/60 border border-gray-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyber-green" />
                <span>Console Monospace Font</span>
              </label>
              <span className="text-[11px] font-mono text-cyber-green font-semibold">
                {currentMono}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FONT_MONO_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChangeMono(f.id)}
                  style={{ fontFamily: f.family }}
                  className={`p-2.5 rounded-lg border text-left transition-all text-xs flex flex-col justify-between ${
                    currentMono === f.id
                      ? 'border-cyber-green bg-cyber-green/15 text-white font-bold shadow-sm'
                      : 'border-gray-800 bg-dark-900/80 text-gray-300 hover:border-gray-700 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-mono">{f.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono opacity-80 mt-0.5">
                    {f.preview}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Font Size & Weight Adjustments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Font Sizing Scale */}
          <div className="p-3.5 rounded-xl bg-dark-950/60 border border-gray-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white">Dashboard Font Scale</span>
              <span className="text-cyber-purple font-semibold">
                {FONT_SIZE_OPTIONS.find((s) => s.id === currentSize)?.label}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {FONT_SIZE_OPTIONS.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => onChangeSize(size.id)}
                  className={`py-1.5 px-2 rounded-lg border font-mono text-center transition-all ${
                    currentSize === size.id
                      ? 'bg-cyber-purple/20 border-cyber-purple text-white font-bold'
                      : 'border-gray-800 bg-dark-900 text-gray-400 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  <div className="text-xs">{size.name}</div>
                  <div className="text-[10px] opacity-75">{size.scale}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Weight Scale */}
          <div className="p-3.5 rounded-xl bg-dark-950/60 border border-gray-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white">Typography Weight Balance</span>
              <span className="text-cyber-blue font-semibold">
                {FONT_WEIGHT_OPTIONS.find((w) => w.id === currentWeight)?.name}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {FONT_WEIGHT_OPTIONS.map((weight) => (
                <button
                  key={weight.id}
                  type="button"
                  onClick={() => onChangeWeight(weight.id)}
                  className={`py-2 px-2 rounded-lg border font-mono text-xs text-center transition-all ${
                    currentWeight === weight.id
                      ? 'bg-cyber-blue/20 border-cyber-blue text-white font-bold'
                      : 'border-gray-800 bg-dark-900 text-gray-400 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  {weight.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Interactive Typography & Theme Preview Box */}
      <div className="p-4 rounded-xl border border-gray-800/90 bg-dark-950/80 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono text-gray-400 border-b border-gray-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-cyber-blue" />
            <span className="font-bold text-white">Live Real-Time Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]">
              Theme: <span className="text-white font-bold">{currentTheme}</span>
            </span>
            <span>•</span>
            <span className="text-[11px]">
              UI: <span className="text-white font-bold">{currentSans}</span>
            </span>
            <span>•</span>
            <span className="text-[11px]">
              Console: <span className="text-white font-bold">{currentMono}</span>
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white tracking-wide">
              LogSentinel SOC Telemetry & Real-Time Threat Intelligence
            </h4>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyber-green/10 text-cyber-green border border-cyber-green/30">
              HEALTHY • 2,450 LOGS/S
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Drain3 online tree parser clustering 1,000,000+ HDFS events. Real-time LSTM reconstruction error calculated with PyTorch autoencoder.
          </p>

          <div className="p-2.5 rounded-lg bg-dark-900 border border-gray-800 font-mono text-xs space-y-1">
            <div className="text-cyber-blue flex items-center justify-between">
              <span>[04:22:18] INFO Verification passed for block blk_-1608996688323678480</span>
              <span className="text-gray-400 text-[10px]">latency: 0.04ms</span>
            </div>
            <div className="text-cyber-amber flex items-center justify-between">
              <span>[04:22:19] WARN Packet retry detected on datanode 10.250.19.102 (Risk: 34.2)</span>
              <span className="text-cyber-amber text-[10px] font-bold">MONITORING</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Reset Button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onResetDefaults}
          className="px-3.5 py-1.5 rounded-lg border border-gray-700 bg-dark-900 hover:bg-dark-800 text-gray-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Appearance to Defaults</span>
        </button>
      </div>
    </div>
  );
}

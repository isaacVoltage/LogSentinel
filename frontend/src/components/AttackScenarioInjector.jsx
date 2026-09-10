import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Zap, Flame, Lock, Skull, ChevronDown, Play, Loader2 } from 'lucide-react';

const SCENARIOS = [
  {
    id: 'ssh_brute_force',
    title: 'SSH Auth Brute Force',
    subtitle: 'Repeated root auth failure & illegal shell bypass',
    icon: Lock,
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    intensity: 'P2 High'
  },
  {
    id: 'ddos_flood',
    title: 'DDoS Traffic Flood',
    subtitle: 'Botnet HTTP 503 flood & gateway thread lock',
    icon: Zap,
    badgeColor: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    intensity: 'P1 Critical'
  },
  {
    id: 'jvm_oom',
    title: 'JVM OutOfMemory Crash',
    subtitle: 'GC pause freeze, heap dump & OS OOM-Killer',
    icon: Flame,
    badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    intensity: 'P2 High'
  },
  {
    id: 'privilege_escalation',
    title: 'Privilege Escalation',
    subtitle: 'SELinux denial, UID spoofing & root token forgery',
    icon: ShieldAlert,
    badgeColor: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
    intensity: 'P1 Critical'
  },
  {
    id: 'ransomware',
    title: 'Ransomware & Corruption',
    subtitle: 'Mass file deletion, MD5 mismatch & volume lock',
    icon: Skull,
    badgeColor: 'border-red-600/50 bg-red-600/15 text-red-400',
    intensity: 'P1 Emergency'
  }
];

export default function AttackScenarioInjector({ onAttackTriggered }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingScenario, setLoadingScenario] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInjectAttack = async (scenarioId, scenarioTitle) => {
    setLoadingScenario(scenarioId);
    try {
      const res = await fetch('/api/simulate/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioId, count: 8 })
      });

      if (res.ok) {
        const data = await res.json();
        if (onAttackTriggered) {
          onAttackTriggered({
            success: true,
            title: scenarioTitle,
            logsCount: data.injected_logs_count,
            peakRisk: data.peak_risk_score,
            message: data.message
          });
        }
      } else {
        const err = await res.json();
        if (onAttackTriggered) {
          onAttackTriggered({
            success: false,
            title: scenarioTitle,
            message: err.detail || 'Failed to inject attack scenario.'
          });
        }
      }
    } catch (error) {
      console.error('Error firing attack scenario:', error);
      if (onAttackTriggered) {
        onAttackTriggered({
          success: false,
          title: scenarioTitle,
          message: 'Network error connecting to ingestion API.'
        });
      }
    } finally {
      setLoadingScenario(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Injector Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loadingScenario !== null}
        className="px-3.5 py-1.5 rounded-xl border border-red-500/40 bg-gradient-to-r from-red-500/20 via-rose-500/10 to-red-600/20 hover:border-red-500 hover:from-red-500/30 hover:to-rose-600/30 text-red-300 text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-950/40 active:scale-95"
        title="Simulate live cyber attack log sequence"
      >
        <ShieldAlert className={`w-4 h-4 text-red-400 ${loadingScenario ? 'animate-bounce' : ''}`} />
        <span>{loadingScenario ? 'Injecting Threat...' : 'Inject Attack Scenario'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-red-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel bg-dark-900/95 border border-red-500/30 shadow-2xl shadow-red-950/60 z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b border-gray-800 bg-red-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Simulate Cyber Threat</span>
            </div>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
              5 Attack Profiles
            </span>
          </div>

          <div className="p-2 space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
            {SCENARIOS.map((item) => {
              const IconComponent = item.icon;
              const isLoading = loadingScenario === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleInjectAttack(item.id, item.title)}
                  disabled={loadingScenario !== null}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all flex items-start gap-3 group text-gray-200 hover:text-white"
                >
                  <div className="p-2 rounded-lg bg-gray-800/80 group-hover:bg-red-500/20 text-red-400 border border-gray-700/50 shrink-0 mt-0.5">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                    ) : (
                      <IconComponent className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold font-mono text-gray-100 group-hover:text-red-300 transition-colors">
                        {item.title}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                        {item.intensity}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5 line-clamp-1 group-hover:text-gray-300">
                      {item.subtitle}
                    </p>
                  </div>
                  <Play className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-400 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

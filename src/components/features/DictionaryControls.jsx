import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Settings, RefreshCw, ChevronDown, FileCode, Zap, CheckCircle } from 'lucide-react';

const DICTIONARIES = ['FIX40', 'FIX41', 'FIX42', 'FIX43', 'FIX44'];

const DictionaryControls = ({ 
  mode, 
  setMode, 
  activeDict, 
  onLoadDict, 
  customFileName, 
  onFileUpload, 
  onClearCustom 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionClick = (type, value) => {
    setIsOpen(false);
    if (type === 'custom') {
      document.getElementById('dict-upload').click();
    } else if (type === 'auto') {
      setMode('auto');
    } else if (type === 'manual') {
      setMode('manual');
      onLoadDict(value);
    }
  };

  // Determine the display label for the trigger button
  let triggerLabel = "Select Dictionary";
  let TriggerIcon = Settings;
  
  if (customFileName) {
    triggerLabel = "Custom Dictionary";
    TriggerIcon = Upload;
  } else if (mode === 'auto') {
    triggerLabel = "Auto-Detect";
    TriggerIcon = Zap;
  } else {
    triggerLabel = activeDict.replace("FIX", "FIX ");
    TriggerIcon = FileCode;
  }

  return (
    <div className="flex items-center gap-3 bg-white p-1.5 pr-3 rounded-lg border border-slate-200 shadow-sm" ref={dropdownRef}>
      
      {/* Icon Label Section */}
      <div className="flex items-center gap-2 px-2 text-slate-400 border-r border-slate-100">
        <Settings size={16} />
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-sm font-medium text-slate-700 transition-all min-w-[160px] justify-between group"
        >
          <div className="flex items-center gap-2">
             <TriggerIcon 
               size={14} 
               className={mode === 'auto' && !customFileName ? "text-amber-500" : (customFileName ? "text-emerald-500" : "text-blue-500")} 
             />
             <span className="truncate max-w-[120px]">{triggerLabel}</span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-100">
            {/* Auto Detect Section */}
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
              Selection Mode
            </div>
            
            <button
              onClick={() => handleOptionClick('auto')}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${mode === 'auto' && !customFileName ? 'bg-blue-50/60' : ''}`}
            >
              <div className={`p-1.5 rounded-md ${mode === 'auto' && !customFileName ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                <Zap size={16} />
              </div>
              <div className="flex flex-col flex-1">
                <span className={`font-medium ${mode === 'auto' && !customFileName ? 'text-blue-700' : 'text-slate-700'}`}>Auto-Detect</span>
                <span className="text-[10px] text-slate-400">Scans Tag 8 (BeginString)</span>
              </div>
              {mode === 'auto' && !customFileName && <CheckCircle size={14} className="text-blue-600" />}
            </button>

            <div className="my-1 border-t border-slate-100" />
            
            {/* Standard Dictionaries */}
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
              Standard Specs
            </div>

            <div className="max-h-48 overflow-y-auto">
              {DICTIONARIES.map(d => (
                <button
                  key={d}
                  onClick={() => handleOptionClick('manual', d)}
                  className={`flex items-center gap-3 px-4 py-2 text-sm text-left w-full hover:bg-slate-50 transition-colors ${mode === 'manual' && activeDict === d && !customFileName ? 'bg-blue-50/30' : ''}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ml-1.5 mr-1 ${mode === 'manual' && activeDict === d && !customFileName ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  <span className={mode === 'manual' && activeDict === d && !customFileName ? 'text-blue-700 font-medium' : 'text-slate-600'}>
                    {d.replace('FIX', 'FIX ')}
                  </span>
                  {mode === 'manual' && activeDict === d && !customFileName && <CheckCircle size={14} className="ml-auto text-blue-600" />}
                </button>
              ))}
            </div>

            <div className="my-1 border-t border-slate-100" />

            {/* Custom Upload */}
            <button
              onClick={() => handleOptionClick('custom')}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${customFileName ? 'bg-emerald-50/60' : ''}`}
            >
              <div className={`p-1.5 rounded-md ${customFileName ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                <Upload size={16} />
              </div>
              <div className="flex flex-col flex-1">
                <span className={`font-medium ${customFileName ? 'text-emerald-700' : 'text-slate-700'}`}>Upload Custom XML</span>
                <span className="text-[10px] text-slate-400">Overrides standard definitions</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Active State Indicator */}
      <div className="flex items-center pl-2 border-l border-slate-100 min-w-[140px]">
        {customFileName ? (
          <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium border border-emerald-100 w-full justify-between">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Upload size={10} />
              <span className="truncate">{customFileName}</span>
            </div>
            <button onClick={onClearCustom} className="hover:text-emerald-900 p-0.5 rounded-full hover:bg-emerald-200 transition-colors shrink-0">
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500 w-full">
             {mode === 'auto' && (
               <RefreshCw size={12} className="animate-[spin_3s_linear_infinite] text-amber-500 shrink-0" />
             )}
             <span className="truncate">Active: <span className="font-mono font-bold text-slate-700">{activeDict}</span></span>
          </div>
        )}
      </div>

      <input 
        id="dict-upload"
        type="file" 
        accept=".xml" 
        onChange={onFileUpload} 
        className="hidden"
      />
    </div>
  );
};

export default DictionaryControls;
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowRightLeft, Play, Trash2 } from 'lucide-react';
import { DEFAULT_TAGS, DEFAULT_ENUMS } from './constants/fixData';
import { parseFixMessage, parseQuickFixXml } from './utils/parsers';
import CopyDropdown from './components/features/CopyDropdown';
import SingleView from './components/features/SingleView';
import DiffView from './components/features/DiffView';
import DictionaryControls from './components/features/DictionaryControls';

export default function App() {
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [mode, setMode] = useState("single"); 
  
  // Dictionary State
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [enums, setEnums] = useState(DEFAULT_ENUMS);
  const [groups, setGroups] = useState({});
  
  // Dictionary Management
  const [dictMode, setDictMode] = useState("auto"); // 'auto' | 'manual'
  const [activeDictName, setActiveDictName] = useState("FIX44"); // Default fallback
  const [customDictFile, setCustomDictFile] = useState(null);
  
  // Parsed Messages (Memoized for performance)
  const parsed1 = useMemo(() => parseFixMessage(input1), [input1]);
  const parsed2 = useMemo(() => parseFixMessage(input2), [input2]);

  // --- Auto-Detection Logic ---
  useEffect(() => {
    if (dictMode !== 'auto' || customDictFile) return;

    // Try to find BeginString (Tag 8) in either message
    const beginStringTag = parsed1.find(p => p.tag === 8) || parsed2.find(p => p.tag === 8);
    
    if (beginStringTag) {
      // Convert "FIX.4.2" -> "FIX42"
      const detectedVersion = beginStringTag.value.replace("FIX.", "FIX").replace(".", "");
      
      // Validate it's a standard version we support
      const validVersions = ['FIX40', 'FIX41', 'FIX42', 'FIX43', 'FIX44'];
      if (validVersions.includes(detectedVersion) && detectedVersion !== activeDictName) {
        console.log(`Auto-detected Dictionary: ${detectedVersion}`);
        loadStandardDictionary(detectedVersion);
      }
    }
  }, [parsed1, parsed2, dictMode, customDictFile, activeDictName]);

  // --- Dictionary Loading ---
  const loadStandardDictionary = async (version) => {
    try {
      // Assuming files are in public/dictionaries/FIX4x.xml
      const response = await fetch(`./dictionaries/${version}.xml`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      
      const { tags: newTags, enums: newEnums, groups: newGroups } = parseQuickFixXml(text);
      setTags(newTags);
      setEnums(newEnums);
      setGroups(newGroups);
      setActiveDictName(version);
    } catch (err) {
      console.warn(`Could not load dictionary ${version}. ensure /public/dictionaries/${version}.xml exists.`);
      // We don't alert here to avoid spamming the user if files are missing in dev
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const { tags: newTags, enums: newEnums, groups: newGroups } = parseQuickFixXml(text);
        setTags(newTags);
        setEnums(newEnums);
        setGroups(newGroups);
        setCustomDictFile(file.name);
        setDictMode("manual"); // Lock to manual so auto-detect doesn't override
      } catch (err) {
        alert("Failed to parse XML dictionary.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const clearCustomDictionary = () => {
    setCustomDictFile(null);
    setDictMode("auto"); // Revert to auto behavior
    // Re-trigger load of current default or 4.4
    loadStandardDictionary("FIX44");
  };

  // Initial Load
  useEffect(() => {
    // Load default on mount
    loadStandardDictionary("FIX44");
  }, []);

  // --- View Mode Logic ---
  useEffect(() => {
    if (input2.length > 0 && mode === 'single') setMode('diff');
    if (input2.length === 0 && mode === 'diff') setMode('single');
  }, [input2.length]);

  const loadExample = () => {
    setInput1("8=FIX.4.4^A9=120^A35=D^A34=2^A49=TEST^A56=EXEC^A52=20230101-12:00:00^A11=ORDER1^A55=MSFT^A54=1^A38=100^A40=2^A44=250.00^A10=123^A");
    setInput2("8=FIX.4.4^A9=120^A35=D^A34=2^A49=TEST^A56=EXEC^A52=20230101-12:00:00^A11=ORDER1^A55=MSFT^A54=1^A38=1000^A40=2^A44=250.00^A10=123^A");
    setMode("diff");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Area */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <ArrowRightLeft className="text-blue-600" />
              Senior FIX Analyzer
            </h1>
            <p className="text-slate-500 mt-1">Multi-format parser & visual diff tool</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            
            <DictionaryControls 
              mode={dictMode}
              setMode={setDictMode}
              activeDict={activeDictName}
              onLoadDict={loadStandardDictionary}
              customFileName={customDictFile}
              onFileUpload={handleFileUpload}
              onClearCustom={clearCustomDictionary}
            />

            <div className="h-8 w-px bg-slate-300 mx-1 hidden sm:block"></div>

            <button 
              onClick={loadExample} 
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <Play size={16} className="text-green-600" /> Example
            </button>
            <button 
              onClick={() => { setInput1(""); setInput2(""); }} 
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm font-medium shadow-sm"
            >
              <Trash2 size={16} /> Clear
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-700">Message 1</label>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Detected: {parsed1.length} Tags</span>
              </div>
              <CopyDropdown data={parsed1} tags={tags} />
            </div>
            <textarea
              className="w-full h-48 p-4 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm transition-all resize-none"
              placeholder="Paste FIX message here... (e.g. 8=FIX.4.4|9=123...)"
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <label className="text-sm font-bold text-slate-700">Message 2</label>
                 <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Detected: {parsed2.length} Tags</span>
              </div>
              <CopyDropdown data={parsed2} tags={tags} />
            </div>
            <textarea
              className={`w-full h-48 p-4 border rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all resize-none ${input2 ? 'border-slate-300' : 'border-dashed border-slate-300 bg-slate-50'}`}
              placeholder="Paste second message here to compare..."
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
            />
          </div>
        </div>

        {/* Results Area */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-gray-200 pb-2">
            <h2 className="text-lg font-semibold text-slate-800">Analysis Results</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setMode('single')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Single View
              </button>
              <button 
                onClick={() => setMode('diff')}
                disabled={!input2}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'diff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 disabled:opacity-50'}`}
              >
                Comparison Diff
              </button>
            </div>
          </div>

          {mode === 'single' ? (
            <SingleView 
              data={parsed1} 
              tags={tags} 
              enums={enums} 
              groups={groups}
            />
          ) : (
            <DiffView data1={parsed1} data2={parsed2} tags={tags} enums={enums} groups={groups} />
          )}
        </div>
      </div>
    </div>
  );
}
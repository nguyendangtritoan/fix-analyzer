import React, { useState, useMemo, useRef } from 'react';
import { ArrowRightLeft, Play, Trash2, Upload, CheckCircle, X } from 'lucide-react';
import { DEFAULT_TAGS, DEFAULT_ENUMS } from './constants/fixData';
import { parseFixMessage, parseQuickFixXml } from './utils/parsers';
import CopyDropdown from './components/features/CopyDropdown';
import SingleView from './components/features/SingleView';
import DiffView from './components/features/DiffView';

export default function App() {
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [mode, setMode] = useState("single"); 
  
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [enums, setEnums] = useState(DEFAULT_ENUMS);
  const [groups, setGroups] = useState({}); // Default to empty
  const [dictFileName, setDictFileName] = useState(null);
  const fileInputRef = useRef(null);

  const parsed1 = useMemo(() => parseFixMessage(input1), [input1]);
  const parsed2 = useMemo(() => parseFixMessage(input2), [input2]);

  React.useEffect(() => {
    if (input2.length > 0 && mode === 'single') setMode('diff');
    if (input2.length === 0 && mode === 'diff') setMode('single');
  }, [input2.length]);

  const loadExample = () => {
    // Example with Repeating Groups (NoPartyIDs=453)
    setInput1("8=FIX.4.4^A9=196^A35=X^A262=req1^A268=2^A277=1^A48=EURUSD^A22=4^A269=0^A270=1.12^A271=1000000^A277=1^A48=EURUSD^A22=4^A269=1^A270=1.13^A271=1000000^A453=2^A448=BANKA^A447=D^A452=1^A802=1^A523=TraderA^A803=1^A448=CLIENTB^A447=D^A452=3^A10=188^A");
    setInput2("8=FIX.4.4^A9=196^A35=X^A262=req1^A268=2^A277=1^A48=EURUSD^A22=4^A269=0^A270=1.12^A271=1000000^A277=1^A48=EURUSD^A22=4^A269=1^A270=1.13^A271=1000000^A453=2^A448=BANKA^A447=D^A452=1^A802=1^A523=TraderA^A803=1^A448=CLIENTCHANGED^A447=D^A452=3^A10=199^A");
    setMode("diff");
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
        setDictFileName(file.name);
      } catch (err) {
        alert("Failed to parse XML dictionary. Ensure it follows standard QuickFIX format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const clearDictionary = () => {
    setTags(DEFAULT_TAGS);
    setEnums(DEFAULT_ENUMS);
    setGroups({});
    setDictFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <ArrowRightLeft className="text-blue-600" />
              Senior FIX Analyzer
            </h1>
            <p className="text-slate-500 mt-1">Multi-format parser & visual diff tool</p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Dictionary Loader */}
            <div className="flex items-center gap-2 mr-2">
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".xml" 
                onChange={handleFileUpload} 
                className="hidden"
              />
              {dictFileName ? (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm border border-blue-200">
                  <CheckCircle size={14} />
                  <span className="truncate max-w-[150px] font-medium" title={dictFileName}>{dictFileName}</span>
                  <button onClick={clearDictionary} className="hover:text-red-500 ml-1">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
                  title="Upload QuickFIX XML Dictionary (FIX44.xml, etc.)"
                >
                  <Upload size={16} /> Load Dictionary
                </button>
              )}
            </div>

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
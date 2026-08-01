import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRightLeft, ListIndentIncrease, Play, Plus, Trash2, X } from 'lucide-react';
import { parseFixMessage } from '../utils/parsers';
import { TAG_HIGHLIGHT_STYLES } from '../utils/highlightUtils';
import CopyDropdown from '../components/features/CopyDropdown';
import SingleView from '../components/features/SingleView';
import DiffView from '../components/features/DiffView';
import { useFixDictionary } from '../context/useFixDictionary';

const createInitialMessages = () => [
  { id: 1, value: "" },
  { id: 2, value: "" },
];

export default function MessageAnalyzerPage() {
  const [messageInputs, setMessageInputs] = useState(createInitialMessages);
  const [mode, setMode] = useState("single");
  const [groupIndentEnabled, setGroupIndentEnabled] = useState(true);
  const [highlightedTags, setHighlightedTags] = useState([]);

  const {
    tags,
    enums,
    groups,
    mode: dictionaryMode,
    customFileName,
    autoDetectBeginString,
  } = useFixDictionary();

  // Parsed Messages (Memoized for performance)
  const parsedMessages = useMemo(() => (
    messageInputs.map((message, index) => ({
      ...message,
      label: `Message ${index + 1}`,
      data: parseFixMessage(message.value),
    }))
  ), [messageInputs]);

  const comparisonMessages = useMemo(() => (
    parsedMessages.filter(message => message.value.trim().length > 0)
  ), [parsedMessages]);

  const primaryParsed = parsedMessages[0]?.data || [];
  const canCompare = comparisonMessages.length >= 2;
  const inputGridClass = messageInputs.length <= 2
    ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
    : "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6";

  const updateMessageInput = (id, value) => {
    const populatedBefore = messageInputs.filter(message => message.value.trim().length > 0).length;
    const nextMessages = messageInputs.map(message => message.id === id ? { ...message, value } : message);
    const populatedAfter = nextMessages.filter(message => message.value.trim().length > 0).length;

    setMessageInputs(nextMessages);
    if (populatedBefore < 2 && populatedAfter >= 2) setMode('diff');
    if (populatedAfter < 2) setMode('single');
  };

  const addMessageInput = () => {
    setMessageInputs(currentMessages => {
      const nextId = Math.max(...currentMessages.map(message => message.id)) + 1;
      return [...currentMessages, { id: nextId, value: "" }];
    });
  };

  const removeMessageInput = (id) => {
    if (messageInputs.length <= 2) return;
    const nextMessages = messageInputs.filter(message => message.id !== id);
    setMessageInputs(nextMessages);
    if (nextMessages.filter(message => message.value.trim().length > 0).length < 2) setMode('single');
  };

  const toggleHighlightedTag = (tag) => {
    if (tag === undefined || tag === null) return;
    setHighlightedTags(currentTags => {
      if (currentTags.some(item => item.tag === tag)) {
        return currentTags.filter(item => item.tag !== tag);
      }

      const usedColorIndexes = new Set(currentTags.map(item => item.colorIndex));
      const nextColorIndex = TAG_HIGHLIGHT_STYLES.findIndex((_, index) => !usedColorIndexes.has(index));

      return [
        ...currentTags,
        {
          tag,
          colorIndex: nextColorIndex === -1
            ? currentTags.length % TAG_HIGHLIGHT_STYLES.length
            : nextColorIndex,
        },
      ];
    });
  };

  // --- Auto-Detection Logic ---
  useEffect(() => {
    if (dictionaryMode !== 'auto' || customFileName) return;

    // Try to find BeginString (Tag 8) in any message
    const beginStringTag = parsedMessages
      .flatMap(message => message.data)
      .find(p => p.tag === 8);

    if (beginStringTag) {
      autoDetectBeginString(beginStringTag.value);
    }
  }, [autoDetectBeginString, customFileName, dictionaryMode, parsedMessages]);

  const loadExample = () => {
    setMessageInputs([
      {
        id: 1,
        value: "8=FIX.4.4^A9=120^A35=D^A34=2^A49=TEST^A56=EXEC^A52=20230101-12:00:00^A11=ORDER1^A55=MSFT^A54=1^A38=100^A40=2^A44=250.00^A10=123^A",
      },
      {
        id: 2,
        value: "8=FIX.4.4^A9=120^A35=D^A34=2^A49=TEST^A56=EXEC^A52=20230101-12:00:00^A11=ORDER1^A55=MSFT^A54=1^A38=1000^A40=2^A44=250.00^A10=123^A",
      },
      {
        id: 3,
        value: "8=FIX.4.4^A9=120^A35=D^A34=2^A49=TEST^A56=EXEC^A52=20230101-12:00:01^A11=ORDER2^A55=AAPL^A54=2^A38=100^A40=2^A44=190.50^A10=234^A",
      },
    ]);
    setMode("diff");
  };

  return (
    <div className="text-slate-900 p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Area */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <ArrowRightLeft className="text-blue-600" />
              FIX Analysis & Review Tool
            </h1>
            <p className="text-slate-500 mt-1">Multi-format parser & visual diff tool</p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={loadExample}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <Play size={16} className="text-green-600" /> Example
            </button>
            <button
              onClick={addMessageInput}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus size={16} className="text-blue-600" /> Message
            </button>
            <button
              onClick={() => { setMessageInputs(createInitialMessages()); setHighlightedTags([]); setMode('single'); }}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm font-medium shadow-sm"
            >
              <Trash2 size={16} /> Clear
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className={inputGridClass}>
          {parsedMessages.map((message, index) => (
            <div key={message.id} className="space-y-2">
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <label className="text-sm font-bold text-slate-700 whitespace-nowrap">{message.label}</label>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">Detected: {message.data.length} Tags</span>
                </div>
                <div className="flex items-center gap-2">
                  <CopyDropdown data={message.data} tags={tags} />
                  {messageInputs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeMessageInput(message.id)}
                      className="h-8 w-8 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
                      title={`Remove ${message.label}`}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className={`w-full h-48 p-4 border rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all resize-none ${message.value ? 'border-slate-300 bg-white' : index === 0 ? 'border-slate-300 bg-white' : 'border-dashed border-slate-300 bg-slate-50'}`}
                placeholder={index === 0 ? "Paste FIX message here... (e.g. 8=FIX.4.4|9=123...)" : "Paste another message here to compare..."}
                value={message.value}
                onChange={(e) => updateMessageInput(message.id, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Results Area */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
            <div className="flex flex-wrap items-center gap-4">
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
                  disabled={!canCompare}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'diff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 disabled:opacity-50'}`}
                >
                  Comparison Diff
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={groupIndentEnabled}
                onChange={(e) => setGroupIndentEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <span className="flex h-5 w-9 items-center rounded-full bg-slate-300 px-0.5 transition-colors peer-checked:bg-blue-600">
                <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${groupIndentEnabled ? 'translate-x-4' : ''}`} />
              </span>
              <ListIndentIncrease size={16} className={groupIndentEnabled ? 'text-blue-600' : 'text-slate-400'} />
              <span>Group indent</span>
            </label>
          </div>

          {mode === 'single' ? (
            <SingleView
              data={primaryParsed}
              tags={tags}
              enums={enums}
              groups={groups}
              groupIndentEnabled={groupIndentEnabled}
              highlightedTags={highlightedTags}
              onTagClick={toggleHighlightedTag}
            />
          ) : (
            <DiffView
              messages={comparisonMessages}
              tags={tags}
              enums={enums}
              groups={groups}
              groupIndentEnabled={groupIndentEnabled}
              highlightedTags={highlightedTags}
              onTagClick={toggleHighlightedTag}
            />
          )}
        </div>
      </div>
    </div>
  );
}

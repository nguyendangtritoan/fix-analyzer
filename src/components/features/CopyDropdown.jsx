import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { generateOutput, copyToClipboard } from '../../utils/fixUtils';

const CopyDropdown = ({ data, tags }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = (format) => {
    const text = generateOutput(data, format, tags);
    const success = copyToClipboard(text);
    if (success) {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
      setIsOpen(false);
    }
  };

  const options = [
    { id: 'pipe', label: 'Pipe Delimited (|)', desc: 'Standard logs' },
    { id: 'soh', label: 'SOH Delimited (\\x01)', desc: 'Raw protocol' },
    { id: 'bracketed', label: 'Pretty / Bracketed', desc: 'Readable' },
    { id: 'columnar', label: 'Columnar Text', desc: 'Name Tag Value' },
    { id: 'json', label: 'JSON Object', desc: 'Dev tools' },
  ];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={!data || data.length === 0}
        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
          !data || data.length === 0 
            ? 'text-gray-300 cursor-not-allowed' 
            : 'text-blue-600 hover:bg-blue-50 bg-white border border-blue-200 shadow-sm'
        }`}
      >
        {copiedFormat ? <Check size={12} /> : <Copy size={12} />}
        {copiedFormat ? 'Copied!' : 'Copy As'}
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleCopy(opt.id)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex flex-col"
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-xs text-gray-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default CopyDropdown;

import React from 'react';
import { FileText } from 'lucide-react';

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 h-64">
    <FileText size={48} className="mb-4 opacity-20" />
    <p>Enter a FIX message above to visualize it.</p>
  </div>
);
export default EmptyState;
import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestionChipProps {
  text: string;
  onClick: () => void;
}

export const SuggestionChip: React.FC<SuggestionChipProps> = ({ text, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-medium rounded-full transition-colors duration-200 whitespace-nowrap"
    >
      <Sparkles size={14} className="text-indigo-500" />
      {text}
    </button>
  );
};
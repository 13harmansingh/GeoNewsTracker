import { useState } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <div className="absolute top-24 left-4 right-4 z-20">
      <div className={`
        glass-morphism rounded-xl mt-4 transition-all duration-200
        ${isFocused ? 'ring-2 ring-ios-blue ring-opacity-50' : ''}
      `}>
        <form onSubmit={handleSubmit} className="flex items-center p-3">
          <Search className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search location or news..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="bg-transparent flex-1 outline-none text-gray-700 placeholder-gray-500 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="touch-feedback p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-all ml-2"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
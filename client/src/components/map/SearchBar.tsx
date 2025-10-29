import { useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Search form submitted with query:', query);
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <div className="absolute top-20 left-3 right-3 z-20">
      <div className={`
        glass-morphism rounded-2xl mt-2 transition-all duration-300 transform
        ${isFocused ? 'ring-2 ring-ios-blue ring-opacity-30 scale-[1.02]' : ''}
      `}>
        <form onSubmit={handleSubmit} className="flex items-center px-4 py-3">
          <Search className="w-5 h-5 text-gray-700 mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search worldwide news, cities, or countries..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="bg-transparent flex-1 outline-none text-gray-800 placeholder-gray-500 text-sm font-medium"
            data-testid="input-search"
          />
          {query && (
            <>
              <button
                type="submit"
                className="touch-feedback p-2 rounded-xl bg-ios-blue bg-opacity-20 hover:bg-opacity-30 transition-all ml-2"
                data-testid="button-search"
              >
                <ArrowRight className="w-4 h-4 text-ios-blue" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="touch-feedback p-2 rounded-xl hover:bg-white hover:bg-opacity-20 transition-all ml-1"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
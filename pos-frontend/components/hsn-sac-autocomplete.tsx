'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { api } from '@/lib/api';

interface HsnSacCode {
  id: string;
  code: string;
  description: string;
  gstRate?: number;
  category?: string;
}

interface HsnSacAutocompleteProps {
  value: string;
  onChange: (code: string, gstRate?: number) => void;
  type: 'HSN' | 'SAC';
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export default function HsnSacAutocomplete({
  value,
  onChange,
  type,
  label,
  placeholder = `Search ${type} code...`,
  required = false,
  error,
}: HsnSacAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<HsnSacCode[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCodes = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = type === 'HSN' 
        ? await api.hsnSac.searchHSN(query, 20)
        : await api.hsnSac.searchSAC(query, 20);
      
      setSuggestions(response.data || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.error(`Failed to search ${type} codes:`, err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search by 300ms
    debounceRef.current = setTimeout(() => {
      searchCodes(newValue);
    }, 300);
  };

  const handleSelect = (code: HsnSacCode) => {
    setInputValue(code.code);
    onChange(code.code, code.gstRate);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('', undefined);
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue.length >= 2) {
                searchCodes(inputValue);
              }
            }}
            className={`
              w-full px-3 py-2 pr-20 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
              ${error ? 'border-red-500' : 'border-gray-300'}
            `}
            placeholder={placeholder}
            required={required}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
            {inputValue && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
            <Search className="text-gray-400" size={16} />
          </div>
        </div>

        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className={`
                  w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0
                  ${index === selectedIndex ? 'bg-blue-50' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.code}</div>
                    <div className="text-sm text-gray-600 line-clamp-2">{item.description}</div>
                  </div>
                  {item.gstRate && (
                    <div className="ml-2 text-sm font-medium text-blue-600">
                      {item.gstRate}% GST
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {isOpen && !loading && inputValue.length >= 2 && suggestions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500 text-sm">
            No {type} codes found for "{inputValue}"
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

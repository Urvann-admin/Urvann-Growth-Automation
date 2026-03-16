'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  hideIndicatorWhenSelected?: boolean;
  /** When false, dropdown stays open after selecting an option (e.g. for multi-select). Default true. */
  closeOnSelect?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Choose...',
  label,
  error,
  disabled = false,
  searchable = true,
  hideIndicatorWhenSelected = false,
  closeOnSelect = true,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = ref.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }

      if (searchable) {
        queueMicrotask(() => {
          setSearch('');
          searchInputRef.current?.focus();
        });
      }
    }
  }, [open, searchable]);

  const selectedLabel = options.find((o) => o.value === value)?.label;
  const isReadOnlyWhenSelected = Boolean(hideIndicatorWhenSelected && value && selectedLabel);

  const filteredOptions =
    searchable && search.trim()
      ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase().trim()))
      : options;

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <button
        ref={buttonRef}
        type="button"
        tabIndex={isReadOnlyWhenSelected ? -1 : 0}
        onClick={() => !disabled && !isReadOnlyWhenSelected && setOpen((o) => !o)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-xl bg-white text-left transition-colors ${
          error
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-slate-200 hover:border-slate-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500'
        } ${open ? 'ring-2 ring-pink-500 border-pink-500' : ''} ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : isReadOnlyWhenSelected
            ? 'cursor-default focus:outline-none focus:ring-0'
            : 'cursor-pointer'
        }`}
      >
        <span className={value && selectedLabel ? 'text-slate-900' : 'text-slate-400'}>
          {value && selectedLabel ? selectedLabel : placeholder}
        </span>
        {!isReadOnlyWhenSelected && (
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-2 ${
              open ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {searchable && (
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            <div className="max-h-56 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <p className="text-slate-500 text-sm p-3 text-center">No options found</p>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value ? `${opt.value}-${index}` : `option-${index}`}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        if (closeOnSelect) setOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-pink-50 text-[#E6007A]'
                          : 'text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-medium">{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#E6007A] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

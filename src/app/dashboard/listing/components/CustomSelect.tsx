'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { joinRedirectFormValues, splitRedirectFormValues } from '@/lib/redirectOptionTokens';

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
  /** When true, value is comma-separated; clicking an option toggles it in the list and dropdown stays open. */
  multiSelect?: boolean;
  /**
   * When searchable: allow adding a new token from the search text (exact match against options / existing selection skips the row).
   * Works with multiSelect (comma-separated value) or single-select (e.g. one chip at a time with empty value).
   */
  allowCreate?: boolean;
  /**
   * Multi-select only: store selections joined with a record separator so values can contain commas
   * (e.g. redirect URLs with query strings).
   */
  multiUseRecordSeparator?: boolean;
  /**
   * Where to render the portal menu relative to the trigger.
   * `auto` opens upward when there is not enough space below the field (viewport).
   */
  dropdownPlacement?: 'auto' | 'above' | 'below';
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
  multiSelect = false,
  allowCreate = false,
  multiUseRecordSeparator = false,
  dropdownPlacement = 'auto',
}: CustomSelectProps) {
  const effectiveCloseOnSelect = multiSelect ? false : closeOnSelect;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedValues = multiSelect
    ? multiUseRecordSeparator
      ? splitRedirectFormValues(value)
      : value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
    : [];
  const selectedLabels = multiSelect
    ? selectedValues.map((v) => options.find((o) => o.value === v)?.label ?? v)
    : [];
  const displayText = multiSelect
    ? selectedLabels.length > 0
      ? selectedLabels.join(', ')
      : placeholder
    : value && (options.find((o) => o.value === value)?.label ?? value);
  const isOptionSelected = (optValue: string) =>
    multiSelect ? selectedValues.includes(optValue) : value === optValue;
  const handleOptionClick = (optValue: string) => {
    if (multiSelect) {
      if (!optValue) return;
      const next = selectedValues.includes(optValue)
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue];
      onChange(
        multiUseRecordSeparator ? joinRedirectFormValues(next) : next.join(', ')
      );
    } else {
      onChange(optValue);
      if (effectiveCloseOnSelect) setOpen(false);
    }
  };

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

  const updateDropdownLayout = useCallback(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const gap = 6;
    /** ~search row + max-h-56 list + borders */
    const estPanelHeight = 300;
    let openUpward = false;
    if (dropdownPlacement === 'above') {
      openUpward = true;
    } else if (dropdownPlacement === 'below') {
      openUpward = false;
    } else {
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      openUpward = spaceBelow < estPanelHeight && spaceAbove > spaceBelow;
    }
    setDropdownPosition({
      top: openUpward ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      openUpward,
    });
  }, [open, dropdownPlacement]);

  useEffect(() => {
    if (!open) return;
    updateDropdownLayout();
    if (searchable) {
      queueMicrotask(() => {
        setSearch('');
        searchInputRef.current?.focus();
      });
    }
    window.addEventListener('resize', updateDropdownLayout);
    window.addEventListener('scroll', updateDropdownLayout, true);
    return () => {
      window.removeEventListener('resize', updateDropdownLayout);
      window.removeEventListener('scroll', updateDropdownLayout, true);
    };
  }, [open, searchable, updateDropdownLayout]);

  const selectedLabel = options.find((o) => o.value === value)?.label;
  const isReadOnlyWhenSelected = Boolean(
    !multiSelect && hideIndicatorWhenSelected && value && selectedLabel
  );

  const filteredOptions =
    searchable && search.trim()
      ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase().trim()))
      : options;
  const optionsForList = multiSelect
    ? filteredOptions.filter((opt) => opt.value !== '')
    : filteredOptions;

  const trimmedSearch = search.trim();
  const exactOptionMatch = trimmedSearch
    ? options.some(
        (o) =>
          (o.value && o.value.toLowerCase() === trimmedSearch.toLowerCase()) ||
          (o.label && o.label.toLowerCase() === trimmedSearch.toLowerCase())
      )
    : false;
  const alreadyInMultiValue =
    multiSelect &&
    trimmedSearch &&
    selectedValues.some((v) => v.toLowerCase() === trimmedSearch.toLowerCase());
  const canCreate =
    allowCreate &&
    Boolean(trimmedSearch) &&
    !exactOptionMatch &&
    !(multiSelect && alreadyInMultiValue);

  const applyCreate = () => {
    if (!canCreate) return;
    if (multiSelect) {
      const next = [...selectedValues, trimmedSearch];
      onChange(multiUseRecordSeparator ? joinRedirectFormValues(next) : next.join(', '));
    } else {
      onChange(trimmedSearch);
    }
    setSearch('');
    if (effectiveCloseOnSelect) setOpen(false);
  };

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
        <span className={displayText ? 'text-slate-900' : 'text-slate-400'}>
          {displayText ?? placeholder}
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
              transform: dropdownPosition.openUpward ? 'translateY(-100%)' : undefined,
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
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && allowCreate && canCreate) {
                        e.preventDefault();
                        applyCreate();
                      }
                    }}
                  />
                </div>
              </div>
            )}
            <div className="max-h-56 overflow-y-auto">
              {canCreate && (
                <button
                  type="button"
                  onClick={applyCreate}
                  className="w-full flex items-center px-3 py-2.5 text-left text-sm font-medium text-[#E6007A] hover:bg-pink-50 border-b border-slate-100"
                >
                  Add &quot;{trimmedSearch}&quot;
                </button>
              )}
              {optionsForList.length === 0 && !canCreate ? (
                <p className="text-slate-500 text-sm p-3 text-center">No options found</p>
              ) : (
                optionsForList.map((opt, index) => {
                  const isSelected = isOptionSelected(opt.value);
                  return (
                    <button
                      key={opt.value ? `${opt.value}-${index}` : `option-${index}`}
                      type="button"
                      onClick={() => handleOptionClick(opt.value)}
                      className={`w-full flex items-start justify-between gap-2 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-pink-50 text-[#E6007A]'
                          : 'text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-medium min-w-0 flex-1 break-words whitespace-normal">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#E6007A] shrink-0 mt-0.5" aria-hidden />
                      )}
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

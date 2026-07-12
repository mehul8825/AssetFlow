"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface AutocompleteOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface InlineAutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function InlineAutocomplete({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  disabled = false,
  className = "",
}: InlineAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync search term with selected value when closed
  useEffect(() => {
    if (!isOpen) {
      const selectedOption = options.find((o) => o.value === value);
      setSearchTerm(selectedOption ? selectedOption.label : "");
    }
  }, [value, options, isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredOptions = options.filter((option) => {
    const term = searchTerm.toLowerCase();
    return (
      option.label.toLowerCase().includes(term) ||
      (option.subLabel && option.subLabel.toLowerCase().includes(term))
    );
  });

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [searchTerm, isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const li = listRef.current.children[highlightedIndex] as HTMLElement;
      if (li) {
        li.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        e.preventDefault();
        break;
      case "ArrowUp":
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        e.preventDefault();
        break;
      case "Enter":
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        e.preventDefault();
        break;
      case "Escape":
        setIsOpen(false);
        e.preventDefault();
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
            isOpen ? "rounded-b-none border-b-transparent" : ""
          }`}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!isOpen) {
              setSearchTerm("");
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <div className="absolute right-3 pointer-events-none text-muted-foreground">
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full rounded-b-md border border-t-0 border-input bg-popover shadow-md overflow-hidden">
          <ul
            ref={listRef}
            className="max-h-60 overflow-auto p-1 text-sm text-popover-foreground"
          >
            {filteredOptions.length === 0 ? (
              <li className="py-2 px-3 text-muted-foreground text-center">No options found.</li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={option.value}
                    className={`cursor-pointer rounded-sm px-2 py-1.5 flex items-center justify-between ${
                      isHighlighted ? "bg-accent text-accent-foreground" : ""
                    } ${isSelected && !isHighlighted ? "bg-primary/10 text-primary font-medium" : ""}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      handleSelect(option.value);
                    }}
                  >
                    <span>{option.label}</span>
                    {option.subLabel && (
                      <span className="ml-2 text-xs opacity-60 font-mono">
                        {option.subLabel}
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

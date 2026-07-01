"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type Option = { id: string; name: string };

export function SearchableSelect({
  name,
  options,
  required,
  placeholder = "搜尋名稱 / SKU…",
  defaultValue = "",
  onSelect,
}: {
  name?: string;
  options: Option[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  onSelect?: (id: string, label: string) => void;
}) {
  const initial = options.find((o) => o.id === defaultValue);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.name.toLowerCase().includes(q))
      : options;
    return list.slice(0, 40);
  }, [options, query]);

  return (
    <div className="relative">
      {name && (
        <input type="hidden" name={name} value={selectedId} required={required && !selectedId} />
      )}
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSelectedId(o.id);
                  setQuery(o.name);
                  setOpen(false);
                  onSelect?.(o.id, o.name);
                }}
              >
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && filtered.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg">
          找不到符合的品項
        </p>
      )}
    </div>
  );
}

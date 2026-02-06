"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

export interface KeyTakeawaysProps {
  title?: string;
  items?: string[];
}

export default function KeyTakeaways({ title, items }: KeyTakeawaysProps) {
  const safeTitle = title ?? "Key takeaways";
  const safeItems = Array.isArray(items) ? items.filter((s) => s != null && String(s).trim()) : [];

  if (safeItems.length === 0) return null;

  return (
    <div className="min-w-0 w-full max-w-full rounded-xl border border-gray-700 bg-gray-800/90 p-4 shadow-lg">
      <h4 className="text-sm font-semibold text-emerald-400 mb-2">{safeTitle}</h4>
      <ul className="space-y-1.5">
        {safeItems.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-300">
            <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-500 mt-0.5" />
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

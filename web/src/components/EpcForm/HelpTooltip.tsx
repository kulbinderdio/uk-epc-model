"use client";

import { useState } from "react";

interface Props {
  content: React.ReactNode;
}

export default function HelpTooltip({ content }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block align-middle ml-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold leading-none hover:bg-blue-100 hover:text-blue-600 transition-colors flex items-center justify-center"
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-6 z-20 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs text-gray-700 leading-relaxed">
            {content}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 text-blue-500 hover:underline block"
            >
              Close
            </button>
          </div>
        </>
      )}
    </span>
  );
}

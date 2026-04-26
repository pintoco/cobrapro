'use client';

import { Menu } from 'lucide-react';

interface Props {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: Props) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-4 px-6 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
    </header>
  );
}

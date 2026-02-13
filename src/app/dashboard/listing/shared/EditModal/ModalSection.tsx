'use client';

import { ReactNode } from 'react';

interface ModalSectionProps {
  title: string;
  children: ReactNode;
}

export function ModalSection({ title, children }: ModalSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </section>
  );
}

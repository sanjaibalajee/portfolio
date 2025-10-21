import { type ReactNode } from "react";

interface CaptionProps {
  children: ReactNode;
}

export function Caption({ children }: CaptionProps) {
  return (
    <p className="text-sm text-center text-neutral-600 dark:text-neutral-400 mt-2 italic">
      {children}
    </p>
  );
}

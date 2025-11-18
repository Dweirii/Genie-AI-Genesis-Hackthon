"use client";

import { cn } from "@workspace/ui/lib/utils";
import { BrainIcon, Loader2Icon } from "lucide-react";
import type { HTMLAttributes } from "react";

export type ThinkingIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  text?: string;
};

export const ThinkingIndicator = ({ 
  className, 
  text = "Thinking...",
  ...props 
}: ThinkingIndicatorProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-muted-foreground text-sm",
        "animate-in fade-in-50 slide-in-from-bottom-2 duration-300",
        className
      )}
      {...props}
    >
      <BrainIcon className="size-4 animate-pulse" />
      <span className="font-medium">{text}</span>
      <Loader2Icon className="size-4 animate-spin" />
    </div>
  );
};

ThinkingIndicator.displayName = "ThinkingIndicator";





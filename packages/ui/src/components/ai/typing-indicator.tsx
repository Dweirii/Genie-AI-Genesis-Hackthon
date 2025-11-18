"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { HTMLAttributes } from "react";

export type TypingIndicatorProps = HTMLAttributes<HTMLDivElement>;

export const TypingIndicator = ({ className, ...props }: TypingIndicatorProps) => {
  return (
    <div
      className={cn("flex items-center gap-1 px-3 py-2", className)}
      {...props}
    >
      <div className="flex gap-1">
        <span 
          className="size-2 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
        />
        <span 
          className="size-2 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: "200ms", animationDuration: "1.4s" }}
        />
        <span 
          className="size-2 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: "400ms", animationDuration: "1.4s" }}
        />
      </div>
    </div>
  );
};

TypingIndicator.displayName = "TypingIndicator";




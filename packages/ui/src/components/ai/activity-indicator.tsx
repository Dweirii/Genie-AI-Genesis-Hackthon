"use client";

import { cn } from "@workspace/ui/lib/utils";
import { BrainIcon, SearchIcon, Loader2Icon } from "lucide-react";
import type { HTMLAttributes } from "react";

export type AIActivityIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  activity?: "thinking" | "searching" | "typing" | "processing";
  text?: string;
};

const activityConfig = {
  thinking: {
    icon: BrainIcon,
    text: "Thinking...",
    color: "text-purple-500",
    bgColor: "bg-purple-50 border-purple-200",
  },
  searching: {
    icon: SearchIcon,
    text: "Searching knowledge base...",
    color: "text-blue-500",
    bgColor: "bg-blue-50 border-blue-200",
  },
  typing: {
    icon: Loader2Icon,
    text: "Typing...",
    color: "text-primary",
    bgColor: "bg-muted border-border",
  },
  processing: {
    icon: Loader2Icon,
    text: "Processing...",
    color: "text-orange-500",
    bgColor: "bg-orange-50 border-orange-200",
  },
};

export const AIActivityIndicator = ({ 
  className,
  activity = "typing",
  text,
  ...props 
}: AIActivityIndicatorProps) => {
  const config = activityConfig[activity];
  const Icon = config.icon;
  const displayText = text || config.text;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        "animate-in fade-in-50 slide-in-from-bottom-2 duration-300",
        config.bgColor,
        className
      )}
      {...props}
    >
      <Icon className={cn("size-4", config.color, activity !== "searching" && "animate-spin")} />
      <span className={cn("font-medium", config.color)}>{displayText}</span>
      {activity === "typing" && (
        <div className="flex gap-1 ml-1">
          <span 
            className={cn("size-1.5 animate-bounce rounded-full", config.color)}
            style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
          />
          <span 
            className={cn("size-1.5 animate-bounce rounded-full", config.color)}
            style={{ animationDelay: "200ms", animationDuration: "1.4s" }}
          />
          <span 
            className={cn("size-1.5 animate-bounce rounded-full", config.color)}
            style={{ animationDelay: "400ms", animationDuration: "1.4s" }}
          />
        </div>
      )}
    </div>
  );
};

AIActivityIndicator.displayName = "AIActivityIndicator";





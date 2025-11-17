"use client";

import { cn } from "@workspace/ui/lib/utils";

export interface ImageDisplayProps {
  imageUrls: string[];
  className?: string;
}

export function ImageDisplay({ imageUrls, className }: ImageDisplayProps) {
  if (imageUrls.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 mt-2",
        imageUrls.length > 1 && "gap-2",
        className
      )}
    >
      {imageUrls.map((url, index) => (
        <div
          key={index}
          className="relative rounded-lg border border-border overflow-hidden bg-muted/50"
        >
          <img
            src={url}
            alt={`Message image ${index + 1}`}
            className="max-w-full h-auto"
            style={{
              maxHeight: "300px",
              objectFit: "contain",
              display: "block",
            }}
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}


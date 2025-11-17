"use client";

import { XIcon, AlertCircleIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { ImageUploadError } from "@workspace/ui/hooks/use-image-upload";

export interface ImagePreviewProps {
  images: File[];
  previewUrls: string[];
  onRemove: (index: number) => void;
  errors?: ImageUploadError[];
  className?: string;
}

export function ImagePreview({
  images,
  previewUrls,
  onRemove,
  errors = [],
  className,
}: ImagePreviewProps) {
  if (images.length === 0 && errors.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-2 border-b border-border bg-muted/30",
        className
      )}
    >
      {errors.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircleIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-destructive">
            {errors.map((error, index) => (
              <div key={index}>{error.message}</div>
            ))}
          </div>
        </div>
      )}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div
              key={`${image.name}-${index}`}
              className="relative group"
            >
              <div className="relative w-20 h-20 rounded-lg border border-border overflow-hidden bg-background">
                <img
                  src={previewUrls[index]}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                onClick={() => onRemove(index)}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


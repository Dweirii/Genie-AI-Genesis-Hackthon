"use client";

import { ImageIcon, Loader2Icon, SendIcon, SquareIcon, XIcon } from "lucide-react";
import type {
  ComponentProps,
  HTMLAttributes,
  KeyboardEventHandler,
  DragEventHandler,
} from "react";
import React, { Children, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

type UseAutoResizeTextareaProps = {
  minHeight: number;
  maxHeight?: number;
};

const useAutoResizeTextarea = ({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      // Temporarily shrink to get the right scrollHeight
      textarea.style.height = `${minHeight}px`;

      // Calculate new height
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    // Set initial height
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  // Adjust height on window resize
  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
};

export type AIInputProps = HTMLAttributes<HTMLFormElement>;

export const AIInput = ({ className, children, ...props }: AIInputProps) => (
  <form
    className={cn(
      "w-full bg-transparent",
      className
    )}
    style={{ padding: 0 }}
    {...props}
  >
    <div className="relative flex items-center gap-2 rounded-3xl border border-input bg-transparent! px-3 py-1.5 shadow-sm transition-all focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring/20">
      {children}
    </div>
  </form>
);

export type AIInputTextareaProps = ComponentProps<typeof Textarea> & {
  minHeight?: number;
  maxHeight?: number;
};

export const AIInputTextarea = ({
  onChange,
  className,
  placeholder = "What would you like to know?",
  minHeight = 18,
  maxHeight = 200,
  ...props
}: AIInputTextareaProps) => {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <Textarea
      className={cn(
        "text-sm",
        "w-full resize-none border-none p-0 shadow-none outline-none ring-0",
        "bg-transparent! dark:bg-transparent!",
        "focus-visible:ring-0",
        "placeholder:text-muted-foreground",
        "self-center",
        "overflow-hidden",
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        className
      )}
      style={{ 
        lineHeight: '1.25rem',
        minHeight: '1.25rem',
        paddingTop: '0',
        paddingBottom: '0',
        backgroundColor: 'transparent',
        overflow: 'hidden'
      }}
      name="message"
      onChange={(e) => {
        adjustHeight();
        onChange?.(e);
      }}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      ref={textareaRef}
      {...props}
    />
  );
};

export type AIInputToolbarProps = HTMLAttributes<HTMLDivElement>;

export const AIInputToolbar = ({
  className,
  ...props
}: AIInputToolbarProps) => (
  <div
    className={cn("flex items-center gap-1.5", className)}
    {...props}
  />
);

export type AIInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const AIInputTools = ({ className, ...props }: AIInputToolsProps) => (
  <div
    className={cn(
      "flex items-center gap-1.5",
      className
    )}
    {...props}
  />
);

export type AIInputButtonProps = ComponentProps<typeof Button>;

export const AIInputButton = ({
  variant = "ghost",
  className,
  size,
  ...props
}: AIInputButtonProps) => {
  const newSize =
    (size ?? Children.count(props.children) > 1) ? "default" : "icon";

  return (
    <Button
      className={cn(
        "shrink-0 gap-1.5 rounded-lg h-7 w-7",
        variant === "ghost" && "text-muted-foreground hover:text-foreground hover:bg-muted",
        newSize === "default" && "w-auto px-2.5 h-7",
        className
      )}
      size={newSize}
      type="button"
      variant={variant}
      {...props}
    />
  );
};

export type AIInputSubmitProps = ComponentProps<typeof Button> & {
  status?: "submitted" | "streaming" | "ready" | "error";
};

export const AIInputSubmit = ({
  className,
  variant = "default",
  size = "icon",
  status,
  children,
  disabled,
  ...props
}: AIInputSubmitProps) => {
  const isSubmitting = status === "submitted";
  let Icon = <SendIcon className="h-4 w-4" />;

  if (status === "submitted") {
    Icon = (
      <Loader2Icon 
        className="h-4 w-4 animate-spin" 
        style={{ animationDuration: "0.8s" }} 
      />
    );
  } else if (status === "streaming") {
    Icon = <SquareIcon className="h-4 w-4" />;
  } else if (status === "error") {
    Icon = <XIcon className="h-4 w-4" />;
  }

  return (
    <Button
      className={cn(
        "gap-1.5 rounded-lg h-7 w-7 shrink-0",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-200",
        isSubmitting && "opacity-70",
        className
      )}
      size={size}
      type="submit"
      variant={variant}
      disabled={disabled || isSubmitting}
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
};

export type AIInputModelSelectProps = ComponentProps<typeof Select>;

export const AIInputModelSelect = (props: AIInputModelSelectProps) => (
  <Select {...props} />
);

export type AIInputModelSelectTriggerProps = ComponentProps<
  typeof SelectTrigger
>;

export const AIInputModelSelectTrigger = ({
  className,
  ...props
}: AIInputModelSelectTriggerProps) => (
  <SelectTrigger
    className={cn(
      "border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors",
      "hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
      className
    )}
    {...props}
  />
);

export type AIInputModelSelectContentProps = ComponentProps<
  typeof SelectContent
>;

export const AIInputModelSelectContent = ({
  className,
  ...props
}: AIInputModelSelectContentProps) => (
  <SelectContent className={cn(className)} {...props} />
);

export type AIInputModelSelectItemProps = ComponentProps<typeof SelectItem>;

export const AIInputModelSelectItem = ({
  className,
  ...props
}: AIInputModelSelectItemProps) => (
  <SelectItem className={cn(className)} {...props} />
);

export type AIInputModelSelectValueProps = ComponentProps<typeof SelectValue>;

export const AIInputModelSelectValue = ({
  className,
  ...props
}: AIInputModelSelectValueProps) => (
  <SelectValue className={cn(className)} {...props} />
);

export type AIInputImageButtonProps = ComponentProps<typeof Button> & {
  onImageSelect: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
};

export const AIInputImageButton = ({
  onImageSelect,
  disabled,
  accept = "image/*",
  multiple = true,
  className,
  ...props
}: AIInputImageButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onImageSelect(files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <AIInputButton
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={className}
        {...props}
      >
        <ImageIcon className="h-4 w-4" />
      </AIInputButton>
    </>
  );
};

export type AIInputWithDragDropProps = AIInputProps & {
  onImageDrop?: (files: File[]) => void;
  dragDropEnabled?: boolean;
};

export const AIInputWithDragDrop = ({
  onImageDrop,
  dragDropEnabled = true,
  className,
  children,
  ...props
}: AIInputWithDragDropProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter: DragEventHandler<HTMLFormElement> = (e) => {
    if (!dragDropEnabled || !onImageDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave: DragEventHandler<HTMLFormElement> = (e) => {
    if (!dragDropEnabled || !onImageDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver: DragEventHandler<HTMLFormElement> = (e) => {
    if (!dragDropEnabled || !onImageDrop) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop: DragEventHandler<HTMLFormElement> = (e) => {
    if (!dragDropEnabled || !onImageDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length > 0) {
      onImageDrop(files);
    }
  };

  return (
    <form
      className={cn(
        "w-full bg-transparent",
        isDragging && "ring-2 ring-primary ring-offset-2",
        className
      )}
      style={{ padding: 0 }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      {...props}
    >
      <div className="relative flex items-center gap-2 rounded-3xl border border-input bg-transparent! px-3 py-1.5 shadow-sm transition-all focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring/20">
        {children}
      </div>
    </form>
  );
};
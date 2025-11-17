"use client";

import { useAtomValue } from "jotai";
import { AlertTriangleIcon } from "lucide-react";
import { errorMessageAtom } from "@/modules/widget/atoms/widget-atoms";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

export const WidgetErrorScreen = () => {
  const errorMessage = useAtomValue(errorMessageAtom);

  return (
    <>
      <WidgetHeader className="shadow-sm">
        <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semibold animate-in fade-in-50 duration-500">
          <p className="text-3xl">
            Oops! 😕
          </p>
          <p className="text-lg text-primary-foreground/90">
            Something went wrong
          </p>
        </div>
      </WidgetHeader>
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 p-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
        <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangleIcon className="size-10 text-destructive" />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-medium text-foreground">Configuration Error</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {errorMessage || "Invalid configuration. Please contact support."}
          </p>
        </div>
      </div>
    </>
  );
};

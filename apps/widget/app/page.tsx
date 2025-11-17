"use client"

import { WidgetView } from "@/modules/widget/ui/views/widget-view"
import { use } from "react";

interface Props {
   searchParams: Promise<{ organizationId: string }>;
}
export default function Page( { searchParams }: Props) {
   const { organizationId } =  use(searchParams);
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-full w-full max-w-md">
        <WidgetView organizationId={organizationId}/>
      </div>
    </div>
  )
}

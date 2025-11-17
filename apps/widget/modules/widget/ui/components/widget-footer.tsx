import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useAtomValue, useSetAtom } from "jotai";
import { HomeIcon, InboxIcon } from "lucide-react"
import { screenAtom } from "../../atoms/widget-atoms";

export const WidgetFooter = () => {
  const screen = useAtomValue(screenAtom);
  const setScreen = useSetAtom(screenAtom);

  return (
    <footer className="flex items-center justify-between border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <Button
        className={cn(
          "h-14 flex-1 rounded-none transition-all duration-200",
          screen === "selection" && "bg-primary/5"
        )}
        onClick={() => setScreen("selection")}
        size="icon"
        variant="ghost"
      >
        <div className="flex flex-col items-center gap-1">
          <HomeIcon
            className={cn(
              "size-5 transition-all duration-200",
              screen === "selection" ? "text-primary scale-110" : "text-muted-foreground"
            )}
          />
          <span className={cn(
            "text-xs font-medium transition-colors duration-200",
            screen === "selection" ? "text-primary" : "text-muted-foreground"
          )}>
            Home
          </span>
        </div>
      </Button>
      <Button
        className={cn(
          "h-14 flex-1 rounded-none transition-all duration-200",
          screen === "inbox" && "bg-primary/5"
        )}
        onClick={() => setScreen("inbox")}
        size="icon"
        variant="ghost"
      >
        <div className="flex flex-col items-center gap-1">
          <InboxIcon
            className={cn(
              "size-5 transition-all duration-200",
              screen === "inbox" ? "text-primary scale-110" : "text-muted-foreground"
            )}
          />
          <span className={cn(
            "text-xs font-medium transition-colors duration-200",
            screen === "inbox" ? "text-primary" : "text-muted-foreground"
          )}>
            Inbox
          </span>
        </div>
      </Button>
    </footer>
  );
};

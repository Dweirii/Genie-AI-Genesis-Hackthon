"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { contactSessionIdAtomFamily, conversationIdAtom, organizationIdAtom, screenAtom } from "@/modules/widget/atoms/widget-atoms";
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { WidgetFooter } from "../components/widget-footer";
import { Button } from "@workspace/ui/components/button";
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";

export const WidgetInboxScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  );

  const conversations = usePaginatedQuery(
    api.public.conversations.getMany,
    contactSessionId
      ? {
          contactSessionId,
        }
      : "skip",
    {
      initialNumItems: 10,
    },
  );

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } = useInfiniteScroll({
    status: conversations.status,
    loadMore: conversations.loadMore,
    loadSize: 10,
  });

  return (
    <>
      <WidgetHeader className="shadow-sm">
        <div className="flex items-center gap-x-2">
          <Button
            variant="transparent"
            size="icon"
            onClick={() => setScreen("selection")}
            className="hover:bg-white/20 transition-colors"
          >
            <ArrowLeftIcon className="size-5" />
          </Button>
          <div className="flex flex-col">
            <p className="font-semibold text-base">Inbox</p>
            <p className="text-xs text-primary-foreground/80">
              {conversations?.results.length || 0} conversation{conversations?.results.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </WidgetHeader>
      <div className="flex flex-1 flex-col gap-y-2 p-3 overflow-y-auto">
        {conversations?.results.length > 0 && 
          conversations?.results.map((conversation, index) => (
            <Button
              className="h-auto min-h-20 w-full justify-between p-4 hover:shadow-md transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-2"
              key={conversation._id}
              onClick={() => {
                setConversationId(conversation._id);
                setScreen("chat");
              }}
              variant="outline"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex w-full flex-col gap-3 overflow-hidden text-start">
                <div className="flex w-full items-center justify-between gap-x-2">
                  <p className="text-muted-foreground text-xs font-medium">Chat</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(conversation._creationTime), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-x-2">
                  <p className="truncate text-sm line-clamp-2 text-left">
                    {conversation.lastMessage?.text || "No messages yet"}
                  </p>
                  <ConversationStatusIcon status={conversation.status} className="shrink-0" />
                </div>
              </div>
            </Button>
          ))
        }
        {conversations?.results.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground text-sm text-center">
              No conversations yet.<br />Start a chat to begin!
            </p>
          </div>
        )}
        <InfiniteScrollTrigger
          canLoadMore={canLoadMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          ref={topElementRef}
        />
      </div>
      <WidgetFooter />
    </>
  );
};

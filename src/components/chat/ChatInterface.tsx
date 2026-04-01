"use client";

import { useEffect, useRef } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/lib/contexts/chat-context";

export function ChatInterface() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();
  const isEmptyState = messages.length === 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col p-4 overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        {isEmptyState ? (
          <div className="flex h-full justify-center">
            <MessageList messages={messages} isLoading={status === "streaming"} />
          </div>
        ) : (
          <ScrollArea ref={scrollAreaRef} className="h-full overflow-hidden">
            <div className="pr-4 h-full">
              <MessageList messages={messages} isLoading={status === "streaming"} />
            </div>
          </ScrollArea>
        )}
      </div>
      <div className="mt-4 flex-shrink-0">
        <MessageInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={status === "submitted" || status === "streaming"}
        />
      </div>
    </div>
  );
}

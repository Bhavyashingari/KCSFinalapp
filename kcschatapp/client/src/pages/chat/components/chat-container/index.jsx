// import React from "react";

import { useAppStore } from "@/store";
import ChatHeader from "./components/chat-header";
import MessageBar from "./components/message-bar";
import MessageContainer from "./components/message-container";
import PinnedMessages from "./components/pinned-messages";

const ChatContainer = () => {
  const { showPinnedMessages, setShowPinnedMessages } = useAppStore();
  return (
    <div className="fixed top-0 h-[100vh] w-[100vw] bg-[#1c1d25] flex flex-col md:static md:flex-1">
      <div className="flex-1 flex">
        <div className="flex flex-col flex-1">
          <ChatHeader />
          <MessageContainer />
          <MessageBar />
        </div>
        {showPinnedMessages && (
          <div className="w-1/4 border-l-2 border-[#2f303b]">
            <PinnedMessages onClose={() => setShowPinnedMessages(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;

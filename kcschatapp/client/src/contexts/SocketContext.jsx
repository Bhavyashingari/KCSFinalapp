import { SOCKET_HOST } from "@/lib/constants";
import { useAppStore } from "@/store";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socket = useRef();
  const { userInfo } = useAppStore();

  useEffect(() => {
    if (userInfo) {
      socket.current = io(SOCKET_HOST, {
        withCredentials: true,
        query: { userId: userInfo.id },
      });
      socket.current.on("connect", () => {
        console.log("Connected to socket server");
      });

      const handleReceiveMessage = (message) => {
        // Access the latest state values
        const {
          selectedChatData: currentChatData,
          selectedChatType: currentChatType,
          addMessage,
          addContactInDMContacts,
        } = useAppStore.getState();

        if (
          currentChatType === "contact" &&
          currentChatData &&
          (currentChatData._id === message.sender._id ||
            currentChatData._id === message.recipient._id)
        ) {
          addMessage(message);
        } else {
          toast.info(
            `New message from ${message.sender.firstName} ${message.sender.lastName}`
          );
        }
        addContactInDMContacts(message);
      };

      const handleReceiveChannelMessage = (message) => {
        const {
          selectedChatData,
          selectedChatType,
          addMessage,
          addChannelInChannelLists,
          channels,
        } = useAppStore.getState();

        if (
          selectedChatType === "channel" &&
          selectedChatData &&
          selectedChatData._id === message.channelId
        ) {
          addMessage(message);
        } else {
          const channel = channels.find((c) => c._id === message.channelId);
          if (channel) {
            toast.info(`New message in #${channel.name}`);
          }
        }
        addChannelInChannelLists(message);
      };

      const addNewChannel = (channel) => {
        const { addChannel } = useAppStore.getState();
        addChannel(channel);
      };

      const handleMessageDeleted = ({ messageId }) => {
        const { deleteMessage } = useAppStore.getState();
        deleteMessage(messageId);
      };

      const handleMessageEdited = ({ updatedMessage }) => {
        const { editMessage } = useAppStore.getState();
        editMessage(updatedMessage);
      };

      const handleMessagePinned = ({ pinnedMessage }) => {
        const { addPinnedMessage } = useAppStore.getState();
        addPinnedMessage(pinnedMessage);
      };

      const handleMessageUnpinned = ({ messageId }) => {
        const { removePinnedMessage } = useAppStore.getState();
        removePinnedMessage(messageId);
      };

      const handleDmClosed = ({ recipientId }) => {
        const { directMessagesContacts } = useAppStore.getState();
        const contact = directMessagesContacts.find(
          (c) => c._id === recipientId
        );
        if (contact) {
          toast.error(
            `${contact.firstName} ${contact.lastName} has closed their DMs.`
          );
        }
      };

      socket.current.on("receiveMessage", handleReceiveMessage);
      socket.current.on("receive-channel-message", handleReceiveChannelMessage);
      socket.current.on("new-channel-added", addNewChannel);
      socket.current.on("message-deleted", handleMessageDeleted);
      socket.current.on("message-edited", handleMessageEdited);
      socket.current.on("message-pinned", handleMessagePinned);
      socket.current.on("message-unpinned", handleMessageUnpinned);
      socket.current.on("dm-closed", handleDmClosed);

      return () => {
        socket.current.disconnect();
      };
    }
  }, [userInfo]);

  return (
    <SocketContext.Provider value={socket.current}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;

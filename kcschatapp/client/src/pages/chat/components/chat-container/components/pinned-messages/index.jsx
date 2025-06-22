import apiClient from "@/lib/api-client";
import { GET_PINNED_MESSAGES_ROUTE, HOST } from "@/lib/constants";
import { useAppStore } from "@/store";
import moment from "moment";
import React, { useEffect } from "react";
import { IoCloseSharp } from "react-icons/io5";

const PinnedMessages = ({ onClose }) => {
  const {
    selectedChatData,
    setPinnedMessages,
    pinnedMessages,
  } = useAppStore();
  useEffect(() => {
    const getPinnedMessages = async () => {
      try {
        const response = await apiClient.get(
          `${GET_PINNED_MESSAGES_ROUTE}/${selectedChatData._id}`,
          { withCredentials: true }
        );
        setPinnedMessages(response.data.pinnedMessages);
      } catch (error) {
        console.log(error);
      }
    };
    if (selectedChatData._id) {
      getPinnedMessages();
    }
  }, [selectedChatData, setPinnedMessages]);
  return (
    <div className="bg-[#1c1d25] p-4 h-full w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pinned Messages</h3>
        <IoCloseSharp onClick={onClose} className="cursor-pointer" />
      </div>
      <div className="mt-4 space-y-4 overflow-y-auto">
        {pinnedMessages.map((message) => (
          <div key={message._id} className="p-2 rounded-lg bg-[#2a2b33]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                {message.sender.firstName} {message.sender.lastName}
              </span>
              <span className="text-xs text-gray-400">
                {moment(message.timestamp).format("LT")}
              </span>
            </div>
            <p className="mt-1 text-sm">{message.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PinnedMessages; 
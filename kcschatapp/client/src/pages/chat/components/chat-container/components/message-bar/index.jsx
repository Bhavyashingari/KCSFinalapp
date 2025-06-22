import { IoSend } from "react-icons/io5";
import { GrAttachment } from "react-icons/gr";
import { RiEmojiStickerLine } from "react-icons/ri";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { useSocket } from "@/contexts/SocketContext";
import { MESSAGE_TYPES, UPLOAD_FILE, GET_CHANNEL_DETAILS } from "@/lib/constants";
import apiClient from "@/lib/api-client";
import { MentionsInput, Mention } from "react-mentions";

const MessageBar = () => {
  const emojiRef = useRef();
  const fileInputRef = useRef();
  const {
    selectedChatData,
    userInfo,
    selectedChatType,
    setIsUploading,
    setFileUploadProgress,
  } = useAppStore();
  const [message, setMessage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const socket = useSocket();
  const [channelMembers, setChannelMembers] = useState([]);

  useEffect(() => {
    const getChannelMembers = async () => {
      if (selectedChatType === "channel") {
        try {
          const response = await apiClient.get(
            `${GET_CHANNEL_DETAILS}/${selectedChatData._id}`,
            { withCredentials: true }
          );
          const members = response.data.channel.members.map((member) => ({
            id: member._id,
            display: `${member.firstName} ${member.lastName}`,
          }));
          setChannelMembers(members);
        } catch (error) {
          console.log(error);
        }
      }
    };
    if (selectedChatData) {
      getChannelMembers();
    }
  }, [selectedChatData, selectedChatType]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiRef]);

  const handleAddEmoji = (emoji) => {
    setMessage((msg) => msg + emoji.emoji);
  };

  const handleSendMessage = async () => {
    if (selectedChatType === "contact") {
      socket.emit("sendMessage", {
        sender: userInfo.id,
        content: message,
        recipient: selectedChatData._id,
        messageType: MESSAGE_TYPES.TEXT,
        audioUrl: undefined,
        fileUrl: undefined,
      });
    } else if (selectedChatType === "channel") {
      socket.emit("send-channel-message", {
        sender: userInfo.id,
        content: message,
        messageType: MESSAGE_TYPES.TEXT,
        audioUrl: undefined,
        fileUrl: undefined,
        channelId: selectedChatData._id,
      });
    }
    setMessage("");
  };

  const handleAttachmentChange = async (event) => {
    try {
      const file = event.target.files[0];

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        setIsUploading(true);
        const response = await apiClient.post(UPLOAD_FILE, formData, {
          withCredentials: true,
          onUploadProgress: (data) => {
            setFileUploadProgress(Math.round((100 * data.loaded) / data.total));
          },
        });

        if (response.status === 200 && response.data) {
          setIsUploading(false);
          if (selectedChatType === "contact") {
            socket.emit("sendMessage", {
              sender: userInfo.id,
              content: undefined,
              recipient: selectedChatData._id,
              messageType: MESSAGE_TYPES.FILE,
              audioUrl: undefined,
              fileUrl: response.data.filePath,
            });
          } else if (selectedChatType === "channel") {
            socket.emit("send-channel-message", {
              sender: userInfo.id,
              content: undefined,
              messageType: MESSAGE_TYPES.FILE,
              audioUrl: undefined,
              fileUrl: response.data.filePath,
              channelId: selectedChatData._id,
            });
          }
        }
      }
    } catch (error) {
      setIsUploading(false);
      console.log({ error });
    }
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="h-[10vh] bg-[#1c1d25] flex justify-center items-center px-8 gap-6 mb-5">
      <div className="flex-1 flex bg-[#2a2b33] rounded-md items-center gap-5 pr-5">
        {selectedChatType === "channel" ? (
          <MentionsInput
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message"
            className="flex-1 p-5 bg-transparent rounded-md focus:border-none focus:outline-none"
            style={{
              control: {
                backgroundColor: "#2a2b33",
                fontSize: "16px",
                fontWeight: "normal",
                color: "white",
              },
              input: {
                margin: 0,
                padding: "1.25rem",
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                color: "white",
              },
              suggestions: {
                list: {
                  backgroundColor: "black",
                  border: "1px solid rgba(0,0,0,0.15)",
                  fontSize: 14,
                },
                item: {
                  padding: "5px 15px",
                  borderBottom: "1px solid rgba(0,0,0,0.15)",
                  "&focused": {
                    backgroundColor: "#8417ff",
                  },
                },
              },
            }}
          >
            <Mention
              trigger="@"
              data={channelMembers}
              appendSpaceOnAdd
              style={{ backgroundColor: "#8417ff" }}
            />
          </MentionsInput>
        ) : (
          <input
            type="text"
            className="flex-1 p-5 bg-transparent rounded-md focus:border-none focus:outline-none"
            placeholder="Enter message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}
        <button
          className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
          onClick={handleAttachmentClick} // Trigger the file input click
        >
          <GrAttachment className="text-2xl" />
        </button>
        <input
          type="file"
          className="hidden" // Hide the file input element
          ref={fileInputRef}
          onChange={handleAttachmentChange} // Handle file selection
        />
        <div className="relative">
          <button
            className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
            onClick={() => setEmojiPickerOpen(true)}
          >
            <RiEmojiStickerLine className="text-2xl " />
          </button>
          <div className="absolute bottom-16 right-0" ref={emojiRef}>
            <EmojiPicker
              theme="dark"
              open={emojiPickerOpen}
              onEmojiClick={handleAddEmoji}
              autoFocusSearch={false}
            />
          </div>
        </div>
      </div>
      <button
        className="bg-[#8417ff] rounded-md flex items-center justify-center p-5 gap-2 focus:border-none focus:outline-none hover:bg-[#741bda] focus:bg-[#741bda] transition-all duration-300 "
        onClick={handleSendMessage}
      >
        <IoSend className="text-2xl" />
      </button>
    </div>
  );
};

export default MessageBar;

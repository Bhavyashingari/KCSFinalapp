import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import apiClient from "@/lib/api-client";
import {
  FETCH_ALL_MESSAGES_ROUTE,
  GET_CHANNEL_MESSAGES,
  HOST,
  MESSAGE_TYPES,
  DELETE_MESSAGE_ROUTE,
  EDIT_MESSAGE_ROUTE,
  PIN_MESSAGE_ROUTE,
} from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { IoMdArrowRoundDown } from "react-icons/io";
import { IoCloseSharp } from "react-icons/io5";
import { MdFolderZip } from "react-icons/md";
import { useSocket } from "@/contexts/SocketContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { BsPin, BsPinFill } from "react-icons/bs";

const MessageContainer = () => {
  const [showImage, setShowImage] = useState(false);
  const [imageURL, setImageURL] = useState(null);
  const {
    selectedChatData,
    setSelectedChatMessages,
    selectedChatMessages,
    selectedChatType,
    userInfo,
    setDownloadProgress,
    setIsDownloading,
    pinnedMessages,
  } = useAppStore();
  const messageEndRef = useRef(null);
  const socket = useSocket();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [messageToEdit, setMessageToEdit] = useState(null);
  const [editedMessage, setEditedMessage] = useState("");

  const handlePinMessage = async (message) => {
    try {
      const response = await apiClient.post(
        `${PIN_MESSAGE_ROUTE}/${selectedChatData._id}/${message._id}`,
        {},
        { withCredentials: true }
      );
      socket.emit("pin-message", {
        channelId: selectedChatData._id,
        pinnedMessage: response.data.pinnedMessage,
      });
      toast.success("Message pinned successfully");
    } catch (error) {
      console.log(error);
      toast.error("Error pinning message");
    }
  };

  const handleEditMessage = async () => {
    if (!messageToEdit || !editedMessage) return;
    try {
      const response = await apiClient.put(
        `${EDIT_MESSAGE_ROUTE}/${messageToEdit._id}`,
        { content: editedMessage },
        { withCredentials: true }
      );

      socket.emit("edit-message", {
        updatedMessage: response.data.updatedMessage,
        recipient: messageToEdit.recipient,
        channelId: selectedChatData._id,
      });

      setMessageToEdit(null);
      setEditedMessage("");
      toast.success("Message edited successfully.");
    } catch (error) {
      console.log(error);
      toast.error("Error editing message.");
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await apiClient.delete(`${DELETE_MESSAGE_ROUTE}/${messageToDelete._id}`, {
        withCredentials: true,
      });

      socket.emit("delete-message", {
        messageId: messageToDelete._id,
        recipient: messageToDelete.recipient,
        sender: messageToDelete.sender,
        channelId: selectedChatData._id,
      });

      setShowDeleteDialog(false);
      setMessageToDelete(null);
      toast.success("Message deleted successfully.");
    } catch (error) {
      console.log(error);
      toast.error("Error deleting message.");
    }
  };

  useEffect(() => {
    const getMessages = async () => {
      const response = await apiClient.post(
        FETCH_ALL_MESSAGES_ROUTE,
        {
          id: selectedChatData._id,
        },
        { withCredentials: true }
      );

      if (response.data.messages) {
        setSelectedChatMessages(response.data.messages);
      }
    };
    const getChannelMessages = async () => {
      const response = await apiClient.get(
        `${GET_CHANNEL_MESSAGES}/${selectedChatData._id}`,
        { withCredentials: true }
      );
      if (response.data.messages) {
        setSelectedChatMessages(response.data.messages);
      }
    };
    if (selectedChatData._id) {
      if (selectedChatType === "contact") getMessages();
      else if (selectedChatType === "channel") getChannelMessages();
    }
  }, [selectedChatData, selectedChatType, setSelectedChatMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChatMessages]);

  const checkIfImage = (filePath) => {
    const imageRegex =
      /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|ico|heic|heif)$/i;
    return imageRegex.test(filePath);
  };

  const downloadFile = async (url) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    const response = await apiClient.get(`${HOST}/${url}`, {
      responseType: "blob",
      onDownloadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percentCompleted = Math.round((loaded * 100) / total);
        setDownloadProgress(percentCompleted);
      },
    });
    const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = urlBlob;
    link.setAttribute("download", url.split("/").pop()); // Optional: Specify a file name for the download
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlBlob); // Clean up the URL object
    setIsDownloading(false);
    setDownloadProgress(0);
  };

  const renderMessages = () => {
    let lastDate = null;
    return selectedChatMessages.map((message, index) => {
      const messageDate = moment(message.timestamp).format("YYYY-MM-DD");
      const showDate = messageDate !== lastDate;
      lastDate = messageDate;

      return (
        <div key={index} className="">
          {showDate && (
            <div className="text-center text-gray-500 my-2">
              {moment(message.timestamp).format("LL")}
            </div>
          )}
          {selectedChatType === "contact" && renderPersonalMessages(message)}
          {selectedChatType === "channel" && renderChannelMessages(message)}
        </div>
      );
    });
  };

  const renderPersonalMessages = (message) => {
    return (
      <div
        className={`message group relative ${
          message.sender === selectedChatData._id ? "text-left" : "text-right"
        }`}
      >
        <div className="flex items-center gap-2">
          {message.sender === userInfo.id && (
            <div className="flex gap-2 invisible group-hover:visible">
              <FaEdit
                className="cursor-pointer text-gray-400"
                onClick={() => {
                  setMessageToEdit(message);
                  setEditedMessage(message.content);
                }}
              />
              <FaTrash
                className="cursor-pointer text-red-500"
                onClick={() => {
                  setMessageToDelete(message);
                  setShowDeleteDialog(true);
                }}
              />
            </div>
          )}
          {message.messageType === MESSAGE_TYPES.TEXT && (
            <div>
              {messageToEdit && messageToEdit._id === message._id ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    className="border-gray-400"
                  />
                  <Button onClick={handleEditMessage}>Save</Button>
                  <Button
                    variant="ghost"
                    onClick={() => setMessageToEdit(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div
                  className={`${
                    message.sender !== selectedChatData._id
                      ? "bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
                      : "bg-[#2a2b33]/50 text-white/80 border-[#ffffff]/20"
                  } border inline-block p-4 rounded my-1 max-w-[50%] break-words whitespace-nowrap overflow-hidden text-ellipsis`}
                >
                  {message.content}
                </div>
              )}
            </div>
          )}
        </div>

        {message.messageType === MESSAGE_TYPES.FILE && (
          <div
            className={`${
              message.sender !== selectedChatData._id
                ? "bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
                : "bg-[#2a2b33]/50 text-white/80 border-[#ffffff]/20"
            } border inline-block p-4 rounded my-1 lg:max-w-[50%] break-words`}
          >
            {checkIfImage(message.fileUrl) ? (
              <div
                className="cursor-pointer"
                onClick={() => {
                  setShowImage(true);
                  setImageURL(message.fileUrl);
                }}
              >
                <img
                  src={`${HOST}/${message.fileUrl}`}
                  alt=""
                  height={300}
                  width={300}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-5">
                <span className="text-white/80 text-3xl bg-black/20 rounded-full p-3">
                  <MdFolderZip />
                </span>
                <span>{message.fileUrl.split("/").pop()}</span>
                <span
                  className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
                  onClick={() => downloadFile(message.fileUrl)}
                >
                  <IoMdArrowRoundDown />
                </span>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-600">
          {moment(message.timestamp).format("LT")}
        </div>
      </div>
    );
  };

  const renderChannelMessages = (message) => {
    return (
      <div
        className={`mt-5 group relative ${
          message.sender._id !== userInfo.id ? "text-left" : "text-right"
        }`}
      >
        <div className="flex items-center gap-2">
          {message.sender._id === userInfo.id && (
            <div className="flex gap-2 invisible group-hover:visible">
              <FaEdit
                className="cursor-pointer text-gray-400"
                onClick={() => {
                  setMessageToEdit(message);
                  setEditedMessage(message.content);
                }}
              />
              <FaTrash
                className="cursor-pointer text-red-500"
                onClick={() => {
                  setMessageToDelete(message);
                  setShowDeleteDialog(true);
                }}
              />
              {selectedChatType === "channel" &&
                userInfo.id === selectedChatData.admin && (
                  <div
                    onClick={() => handlePinMessage(message)}
                    className="cursor-pointer"
                  >
                    {pinnedMessages.find((m) => m._id === message._id) ? (
                      <BsPinFill className="text-yellow-500" />
                    ) : (
                      <BsPin className="text-gray-400" />
                    )}
                  </div>
                )}
            </div>
          )}
          {message.messageType === MESSAGE_TYPES.TEXT && (
            <div>
              {messageToEdit && messageToEdit._id === message._id ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    className="border-gray-400"
                  />
                  <Button onClick={handleEditMessage}>Save</Button>
                  <Button
                    variant="ghost"
                    onClick={() => setMessageToEdit(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div
                  className={`${
                    message.sender._id === userInfo.id
                      ? "bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
                      : "bg-[#2a2b33]/50 text-white/80 border-[#ffffff]/20"
                  } border inline-block p-4 rounded my-1 max-w-[50%] break-words ml-9 whitespace-nowrap overflow-hidden text-ellipsis`}
                >
                  {message.content}
                </div>
              )}
            </div>
          )}
        </div>
        {message.messageType === MESSAGE_TYPES.FILE && (
          <div
            className={`${
              message.sender._id === userInfo.id
                ? "bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
                : "bg-[#2a2b33]/50 text-white/80 border-[#ffffff]/20"
            } border inline-block p-4 rounded my-1 max-w-[50%] break-words ml-9`}
          >
            {checkIfImage(message.fileUrl) ? (
              <div
                className="cursor-pointer"
                onClick={() => {
                  setShowImage(true);
                  setImageURL(message.fileUrl);
                }}
              >
                <img
                  src={`${HOST}/${message.fileUrl}`}
                  alt=""
                  height={300}
                  width={300}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-5">
                <span className="text-white/80 text-3xl bg-black/20 rounded-full p-3">
                  <MdFolderZip />
                </span>
                <span>{message.fileUrl.split("/").pop()}</span>
                <span
                  className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
                  onClick={() => downloadFile(message.fileUrl)}
                >
                  <IoMdArrowRoundDown />
                </span>
              </div>
            )}
          </div>
        )}
        {message.sender._id !== userInfo.id ? (
          <div className="flex items-center justify-start gap-3">
            <Avatar className="h-8 w-8">
              {message.sender.image && (
                <AvatarImage
                  src={`${HOST}/${message.sender.image}`}
                  alt="profile"
                  className="rounded-full"
                />
              )}
              <AvatarFallback
                className={`uppercase h-8 w-8 flex ${getColor(
                  message.sender.color
                )} items-center justify-center rounded-full`}
              >
                {message.sender.firstName
                  ? message.sender.firstName.split("").shift()
                  : message.sender.email.split("").shift()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-neutral-400">
              {`${message.sender.firstName} ${message.sender.lastName}`}
            </span>
            <span className="text-xs text-neutral-500">
              {moment(message.timestamp).format("LT")}
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-600">
            {moment(message.timestamp).format("LT")}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden p-4 px-8 md:w-[65vw] lg:w-[70vw] xl:w-[80vw] w-full">
      {renderMessages()}
      <div ref={messageEndRef}></div>
      {showImage && (
        <div className="fixed z-50 top-0 left-0 h-screen w-screen bg-black/80 flex items-center justify-center">
          <div>
            <img
              src={`${HOST}/${imageURL}`}
              className="h-[80vh] w-full bg-cover"
              alt=""
            />
          </div>
          <IoCloseSharp
            className="absolute top-5 right-5 text-3xl cursor-pointer text-white"
            onClick={() => {
              setShowImage(false);
              setImageURL(null);
            }}
          />
        </div>
      )}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowDeleteDialog(false)} variant="ghost">
              Cancel
            </Button>
            <Button onClick={handleDeleteMessage} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageContainer;

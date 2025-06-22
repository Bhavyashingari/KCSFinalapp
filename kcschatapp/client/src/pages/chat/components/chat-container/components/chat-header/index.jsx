import { RiCloseFill } from "react-icons/ri";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store";
import { HOST, GET_ALL_CONTACTS, ADD_MEMBERS_TO_CHANNEL } from "@/lib/constants";
import { getColor } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IoIosPeople } from "react-icons/io";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { GET_CHANNEL_DETAILS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import MultipleSelector from "@/components/ui/multipleselect";
import { toast } from "sonner";
import { BsPin } from "react-icons/bs";

const ChatHeader = () => {
  const {
    selectedChatData,
    closeChat,
    selectedChatType,
    userInfo,
    setShowPinnedMessages,
  } = useAppStore();
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [channelMembers, setChannelMembers] = useState([]);
  const [addMembersMode, setAddMembersMode] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [usersToAdd, setUsersToAdd] = useState([]);

  useEffect(() => {
    const getMembers = async () => {
      try {
        const response = await apiClient.get(
          `${GET_CHANNEL_DETAILS}/${selectedChatData._id}`,
          { withCredentials: true }
        );
        setChannelMembers(response.data.channel.members);
      } catch (error) {
        console.log(error);
      }
    };
    if (isMembersDialogOpen && selectedChatData._id) {
      getMembers();
    }
  }, [isMembersDialogOpen, selectedChatData]);

  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        const response = await apiClient.get(GET_ALL_CONTACTS, {
          withCredentials: true,
        });
        setAllContacts(response.data.contacts);
      } catch (error) {
        console.log(error);
      }
    };

    if (addMembersMode) {
      fetchAllContacts();
    }
  }, [addMembersMode]);

  const handleAddMembers = async () => {
    try {
      const res = await apiClient.post(
        `${ADD_MEMBERS_TO_CHANNEL}/${selectedChatData._id}`,
        { members: usersToAdd.map((user) => user.value) },
        { withCredentials: true }
      );
      if (res.status === 200) {
        setChannelMembers(res.data.channel.members);
        toast.success("Members added successfully");
        setUsersToAdd([]);
        setAddMembersMode(false);
      }
    } catch (err) {
      console.log(err);
      toast.error("Error adding members");
    }
  };

  return (
    <div className="h-[10vh] border-b-2 border-[#2f303b] flex items-center justify-between px-20">
      <div className="flex gap-5 items-center">
        <div className="flex gap-3 items-center justify-center">
          <div className="w-12 h-12 relative flex items-center justify-center">
            {selectedChatType === "contact" ? (
              <Avatar className="w-12 h-12 rounded-full overflow-hidden">
                {selectedChatData.image ? (
                  <AvatarImage
                    src={`${HOST}/${selectedChatData.image}`}
                    alt="profile"
                    className="object-cover w-full h-full bg-black rounded-full"
                  />
                ) : (
                  <div
                    className={`uppercase w-12 h-12 text-lg   border-[1px] ${getColor(
                      selectedChatData.color
                    )} flex items-center justify-center rounded-full`}
                  >
                    {selectedChatData.firstName
                      ? selectedChatData.firstName.split("").shift()
                      : selectedChatData.email.split("").shift()}
                  </div>
                )}
              </Avatar>
            ) : (
              <div
                className={` bg-[#ffffff22] py-3 px-5 flex items-center justify-center rounded-full`}
              >
                #
              </div>
            )}
          </div>
          <div>
            {selectedChatType === "channel" && selectedChatData.name}
            {selectedChatType === "contact" &&
            selectedChatData.firstName &&
            selectedChatData.lastName
              ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
              : ""}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-5">
        {selectedChatType === "channel" && (
          <Dialog
            open={isMembersDialogOpen}
            onOpenChange={(open) => {
              if (!open) setAddMembersMode(false);
              setIsMembersDialogOpen(open);
            }}
          >
            <DialogTrigger>
              <IoIosPeople className="text-3xl" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {addMembersMode ? "Add Members" : "Channel Members"}
                </DialogTitle>
                <DialogDescription>
                  {addMembersMode
                    ? `Select users to add to ${selectedChatData.name}`
                    : `List of members in ${selectedChatData.name}`}
                </DialogDescription>
              </DialogHeader>
              {addMembersMode ? (
                <div>
                  <MultipleSelector
                    value={usersToAdd}
                    onChange={setUsersToAdd}
                    options={allContacts.filter(
                      (c) =>
                        !channelMembers.find((m) => m._id === c.value)
                    )}
                    placeholder="Select users"
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="ghost"
                      onClick={() => setAddMembersMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddMembers}>Add to Channel</Button>
                  </div>
                </div>
              ) : (
                <div>
                  {userInfo.id === selectedChatData.admin && (
                    <Button
                      className="my-2"
                      onClick={() => setAddMembersMode(true)}
                    >
                      Add Members
                    </Button>
                  )}
                  {channelMembers.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center gap-3 p-2 border-b"
                    >
                      <Avatar className="w-10 h-10 rounded-full overflow-hidden">
                        {member.image ? (
                          <AvatarImage
                            src={`${HOST}/${member.image}`}
                            alt="profile"
                            className="object-cover w-full h-full bg-black rounded-full"
                          />
                        ) : (
                          <div
                            className={`uppercase w-10 h-10 text-lg   border-[1px] ${getColor(
                              member.color
                            )} flex items-center justify-center rounded-full`}
                          >
                            {member.firstName
                              ? member.firstName.split("").shift()
                              : member.email.split("").shift()}
                          </div>
                        )}
                      </Avatar>
                      <span>{`${member.firstName} ${member.lastName}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
        {selectedChatType === "channel" && (
          <button onClick={() => setShowPinnedMessages(true)}>
            <BsPin className="text-2xl" />
          </button>
        )}
        <button
          className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
          onClick={closeChat}
        >
          <RiCloseFill className="text-3xl" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;

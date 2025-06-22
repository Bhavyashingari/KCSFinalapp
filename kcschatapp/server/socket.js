import { Server as SocketIOServer } from "socket.io";
import Message from "./model/MessagesModel.js";
import Channel from "./model/ChannelModel.js";
import User from "./model/UserModel.js";

const setupSocket = (server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userSocketMap = new Map();

  const addChannelNotify = async (channel) => {
    if (channel && channel.members) {
      channel.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("new-channel-added", channel);
        }
      });
    }
  };

  const sendMessage = async (message) => {
    const recipient = await User.findById(message.recipient);
    if (recipient && recipient.isDmClosed) {
      const senderSocketId = userSocketMap.get(message.sender);
      if (senderSocketId) {
        io.to(senderSocketId).emit("dm-closed", {
          recipientId: message.recipient,
        });
      }
      return;
    }

    const recipientSocketId = userSocketMap.get(message.recipient);
    const senderSocketId = userSocketMap.get(message.sender);

    // Create the message
    const createdMessage = await Message.create(message);

    // Find the created message by its ID and populate sender and recipient details
    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .populate("recipient", "id email firstName lastName image color")
      .exec();

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", messageData);
    }

    // Optionally, send the message back to the sender (e.g., for message confirmation)
    if (senderSocketId) {
      io.to(senderSocketId).emit("receiveMessage", messageData);
    }
  };

  const sendChannelMessage = async (message) => {
    const { channelId, sender, content, messageType, fileUrl } = message;

    // Create and save the message
    const createdMessage = await Message.create({
      sender,
      recipient: null, // Channel messages don't have a single recipient
      content,
      messageType,
      timestamp: new Date(),
      fileUrl,
    });

    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .exec();

    // Add message to the channel
    await Channel.findByIdAndUpdate(channelId, {
      $push: { messages: createdMessage._id },
    });

    // Fetch all members of the channel
    const channel = await Channel.findById(channelId).populate("members");

    const finalData = { ...messageData._doc, channelId: channel._id };
    if (channel && channel.members) {
      channel.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("receive-channel-message", finalData);
        }
      });
      const adminSocketId = userSocketMap.get(channel.admin._id.toString());
      if (adminSocketId) {
        io.to(adminSocketId).emit("receive-channel-message", finalData);
      }
    }
  };

  const deleteMessage = async ({ messageId, recipient, sender, channelId }) => {
    if (recipient) {
      // Direct message
      const recipientSocketId = userSocketMap.get(recipient.toString());
      const senderSocketId = userSocketMap.get(sender.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("message-deleted", { messageId });
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("message-deleted", { messageId });
      }
    } else {
      // Channel message
      const channel = await Channel.findById(channelId).populate("members");
      if (channel && channel.members) {
        channel.members.forEach((member) => {
          const memberSocketId = userSocketMap.get(member._id.toString());
          if (memberSocketId) {
            io.to(memberSocketId).emit("message-deleted", { messageId });
          }
        });
        const adminSocketId = userSocketMap.get(channel.admin._id.toString());
        if (adminSocketId) {
          io.to(adminSocketId).emit("message-deleted", { messageId });
        }
      }
    }
  };

  const editMessage = async ({ updatedMessage, recipient, channelId }) => {
    if (recipient) {
      // Direct message
      const recipientSocketId = userSocketMap.get(recipient._id.toString());
      const senderSocketId = userSocketMap.get(updatedMessage.sender._id.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("message-edited", { updatedMessage });
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("message-edited", { updatedMessage });
      }
    } else {
      // Channel message
      const channel = await Channel.findById(channelId).populate("members");
      if (channel && channel.members) {
        channel.members.forEach((member) => {
          const memberSocketId = userSocketMap.get(member._id.toString());
          if (memberSocketId) {
            io.to(memberSocketId).emit("message-edited", { updatedMessage });
          }
        });
        const adminSocketId = userSocketMap.get(channel.admin._id.toString());
        if (adminSocketId) {
          io.to(adminSocketId).emit("message-edited", { updatedMessage });
        }
      }
    }
  };

  const pinMessage = async ({ channelId, pinnedMessage }) => {
    const channel = await Channel.findById(channelId).populate("members");
    if (channel && channel.members) {
      channel.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("message-pinned", { pinnedMessage });
        }
      });
      const adminSocketId = userSocketMap.get(channel.admin._id.toString());
      if (adminSocketId) {
        io.to(adminSocketId).emit("message-pinned", { pinnedMessage });
      }
    }
  };

  const unpinMessage = async ({ channelId, messageId }) => {
    const channel = await Channel.findById(channelId).populate("members");
    if (channel && channel.members) {
      channel.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("message-unpinned", { messageId });
        }
      });
      const adminSocketId = userSocketMap.get(channel.admin._id.toString());
      if (adminSocketId) {
        io.to(adminSocketId).emit("message-unpinned", { messageId });
      }
    }
  };

  const disconnect = (socket) => {
    console.log("Client disconnected", socket.id);
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  };

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`User connected: ${userId} with socket ID: ${socket.id}`);
    } else {
      console.log("User ID not provided during connection.");
    }

    socket.on("add-channel-notify", addChannelNotify);

    socket.on("sendMessage", sendMessage);

    socket.on("send-channel-message", sendChannelMessage);

    socket.on("delete-message", deleteMessage);

    socket.on("edit-message", editMessage);

    socket.on("pin-message", pinMessage);
    socket.on("unpin-message", unpinMessage);

    socket.on("disconnect", () => disconnect(socket));
  });
};

export default setupSocket;

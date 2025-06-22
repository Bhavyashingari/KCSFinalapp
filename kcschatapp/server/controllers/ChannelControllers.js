import mongoose from "mongoose";
import Channel from "../model/ChannelModel.js";
import User from "../model/UserModel.js";
import Message from "../model/MessageModel.js";

export const createChannel = async (request, response, next) => {
  try {
    const { name, members } = request.body;
    const userId = request.userId;
    const admin = await User.findById(userId);
    if (!admin) {
      return response.status(400).json({ message: "Admin user not found." });
    }

    const validMembers = await User.find({ _id: { $in: members } });
    if (validMembers.length !== members.length) {
      return response
        .status(400)
        .json({ message: "Some members are not valid users." });
    }

    const newChannel = new Channel({
      name,
      members,
      admin: userId,
    });

    await newChannel.save();

    return response.status(201).json({ channel: newChannel });
  } catch (error) {
    console.error("Error creating channel:", error);
    return response.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserChannels = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const channels = await Channel.find({
      $or: [{ admin: userId }, { members: userId }],
    }).sort({ updatedAt: -1 });

    return res.status(200).json({ channels });
  } catch (error) {
    console.error("Error getting user channels:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getChannelMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId).populate({
      path: "messages",
      populate: {
        path: "sender",
        select: "firstName lastName email _id image color",
      },
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const messages = channel.messages;
    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Error getting channel messages:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getChannelDetails = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId).populate({
      path: "members",
      select: "firstName lastName email _id image color",
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    return res.status(200).json({ channel });
  } catch (error) {
    console.error("Error getting channel details:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addMembersToChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { members } = req.body;
    const userId = req.userId;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (channel.admin.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to add members" });
    }

    const validMembers = await User.find({ _id: { $in: members } });
    if (validMembers.length !== members.length) {
      return res
        .status(400)
        .json({ message: "Some members are not valid users." });
    }

    const existingMembers = channel.members.map((m) => m.toString());
    const newMembers = members.filter((m) => !existingMembers.includes(m));

    if (newMembers.length === 0) {
      return res.status(400).json({ message: "All members are already in the channel." });
    }
    
    channel.members.push(...newMembers);
    await channel.save();
    
    const updatedChannel = await Channel.findById(channelId).populate({
      path: "members",
      select: "firstName lastName email _id image color",
    });

    return res.status(200).json({ channel: updatedChannel });
  } catch (error) {
    console.error("Error adding members to channel:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const pinMessage = async (req, res, next) => {
  try {
    const { channelId, messageId } = req.params;
    const userId = req.userId;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (channel.admin.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to pin messages" });
    }

    if (channel.pinnedMessages.includes(messageId)) {
      return res.status(400).json({ message: "Message already pinned" });
    }

    channel.pinnedMessages.push(messageId);
    await channel.save();

    const updatedMessage = await Message.findById(messageId).populate(
      "sender",
      "id email firstName lastName image color"
    );

    return res.status(200).json({
      message: "Message pinned successfully",
      pinnedMessage: updatedMessage,
    });
  } catch (error) {
    console.error("Error pinning message:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const unpinMessage = async (req, res, next) => {
  try {
    const { channelId, messageId } = req.params;
    const userId = req.userId;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (channel.admin.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to unpin messages" });
    }

    channel.pinnedMessages.pull(messageId);
    await channel.save();

    return res.status(200).json({ message: "Message unpinned successfully" });
  } catch (error) {
    console.error("Error unpinning message:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPinnedMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId).populate({
      path: "pinnedMessages",
      populate: {
        path: "sender",
        select: "firstName lastName email _id image color",
      },
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    return res.status(200).json({ pinnedMessages: channel.pinnedMessages });
  } catch (error) {
    console.error("Error getting pinned messages:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

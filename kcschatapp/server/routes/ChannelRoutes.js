import { Router } from "express";
import {
  createChannel,
  getChannelMessages,
  getUserChannels,
  getChannelDetails,
  addMembersToChannel,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
} from "../controllers/ChannelControllers.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const channelRoutes = Router();

channelRoutes.post("/create-channel", verifyToken, createChannel);
channelRoutes.get("/get-user-channels", verifyToken, getUserChannels);
channelRoutes.get(
  "/get-channel-messages/:channelId",
  verifyToken,
  getChannelMessages
);

channelRoutes.get(
  "/get-channel-details/:channelId",
  verifyToken,
  getChannelDetails
);

channelRoutes.post(
  "/add-members/:channelId",
  verifyToken,
  addMembersToChannel
);

channelRoutes.post(
  "/pin-message/:channelId/:messageId",
  verifyToken,
  pinMessage
);

channelRoutes.delete(
  "/unpin-message/:channelId/:messageId",
  verifyToken,
  unpinMessage
);

channelRoutes.get(
  "/get-pinned-messages/:channelId",
  verifyToken,
  getPinnedMessages
);

export default channelRoutes;

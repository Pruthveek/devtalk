const express = require("express");
const { userAuth } = require("../middlewares/auth");
const Chat = require("../models/chat");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");

const chatRouter = express.Router();

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;
    const isPremium = req.user?.isPremium;

    // Fetch target user's premium status only
    const targetUser = await User.findById(targetUserId).select(
      "isPremium photoUrl"
    );
    const targetIsPremium = targetUser?.isPremium;
    const targetUserPhotoUrl = targetUser?.photoUrl;
    // Check if both are friends
    const isFriend = await ConnectionRequest.exists({
      status: "accepted",
      $or: [
        { fromUserId: userId, toUserId: targetUserId },
        { fromUserId: targetUserId, toUserId: userId },
      ],
    });

    if (!isFriend) {
      return res.status(403).json({ message: "You are not friends." });
    }

    // Check if both are premium users
    if (!isPremium || !targetIsPremium) {
      return res
        .status(403)
        .json({ message: "Both users must be premium to chat." });
    }

    // Find or create chat
    let chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    }).populate({
      path: "messages.senderId",
      select: "firstName lastName photoUrl",
    });

    // If no chat exists, create empty chat object
    if (!chat) {
      return res.status(200).json({
        success: true,
        chat: {
          participants: [userId, targetUserId],
          messages: [],
        },
      });
    }

    // Send chat data
    return res.status(200).json({ success: true,targetUserPhotoUrl, chat });
  } catch (err) {
    console.error("Chat route error:", err);
    res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
});

module.exports = chatRouter;

const express = require("express");
const { userAuth } = require("../middlewares/auth");
const Chat = require("../models/chat");

const chatRouter = express.Router();

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    let chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    }).populate({
      path: "messages.senderId",
      select: "firstName lastName photoUrl",
    });

    if (!chat) {
      return res.status(200).json({
        success: true,
        chat: {
          participants: [userId, targetUserId],
          messages: [],
        },
      });
    }

    res.status(200).json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
});

module.exports = chatRouter;
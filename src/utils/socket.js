const socket = require("socket.io");
const crypto = require("crypto");
const Chat = require("../models/chat");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");

const getSecretRoomId = ({ userId, targetUserId }) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("!@#$%^&*"))
    .digest("hex");
};

const initializeSocket = (server) => {
  const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"];
  const io = socket(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
    },
  });

  io.on("connection", (socket) => {
    socket.on("joinChat", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId({ userId, targetUserId });
      socket.join(roomId);
    });

    socket.on(
      "sendMessage",
      async ({
        firstName,
        photoUrl,
        userId,
        targetUserId,
        text,
        timeString,
      }) => {
        try {
          const roomId = getSecretRoomId({ userId, targetUserId });

          const isFriend = await ConnectionRequest.exists({
            status: "accepted",
            $or: [
              { fromUserId: userId, toUserId: targetUserId },
              { fromUserId: targetUserId, toUserId: userId },
            ],
          });

          if (!isFriend) return;

          const user = await User.findById(userId).select("isPremium");
          const targetUser = await User.findById(targetUserId).select("isPremium");

          if (!user?.isPremium || !targetUser?.isPremium) return;

          let chat = await Chat.findOne({
            participants: { $all: [userId, targetUserId] },
          });

          if (!chat) {
            chat = new Chat({
              participants: [userId, targetUserId],
              messages: [],
            });
          }

          chat.messages.push({ senderId: userId, text });
          await chat.save();

          const newMessage = chat.messages[chat.messages.length - 1];

          io.to(roomId).emit("messageReceived", {
            firstName,
            text,
            photoUrl,
            timeString,
            senderId: userId,
            _id: newMessage._id,
          });
        } catch (error) {
          console.error("Socket sendMessage error:", error);
        }
      }
    );

    socket.on("disconnect", () => {});
  });
};

module.exports = initializeSocket;

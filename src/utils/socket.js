const socket = require("socket.io");
const crypto = require("crypto");
const Chat = require("../models/chat");

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

    socket.on("sendMessage", async ({ firstName, photoUrl, userId, targetUserId, text, timeString }) => {
      try {
        const roomId = getSecretRoomId({ userId, targetUserId });
        
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
    });

    socket.on("disconnect", () => {
      // console.log("User disconnected");
    });
  });
};

module.exports = initializeSocket;
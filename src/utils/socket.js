const socket = require("socket.io");
const crypto = require("crypto");

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
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
    },
  });
  io.on("connection", (socket) => {
    socket.on("joinChat", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId({ userId, targetUserId });
      console.log("userId", roomId);
      socket.join(roomId);
    });
    socket.on(
      "sendMessage",
      ({ firstName, image, userId, targetUserId, text, timeString }) => {
        const roomId = getSecretRoomId({ userId, targetUserId });
        console.log(firstName + " " + text + " " + timeString);
        io.to(roomId).emit("messageReceived", {
          firstName,
          text,
          image,
          timeString,
        });
      }
    );
    socket.on("disconnect", () => {});
  });
};
module.exports = initializeSocket;

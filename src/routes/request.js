const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");
const mongoose = require("mongoose");

// Simple test route
requestRouter.post("/sendConnectionRequest", userAuth, async (req, res) => {
  const user = req.user;
  console.log("Sending a connection request");
  res.json({ message: `${user.firstName} sent the connect request!` });
});

// Send connection request route
requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.toUserId;
      const status = req.params.status.toLowerCase();

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(toUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      // Prevent sending request to self
      if (fromUserId.toString() === toUserId.toString()) {
        return res
          .status(400)
          .json({ message: "You cannot send a request to yourself" });
      }

      // Validate status
      const allowedStatus = ["ignored", "interested"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Status is invalid" });
      }

      // Check if target user exists
      const toUser = await User.findById(toUserId);
      if (!toUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check for existing request in either direction
      const existingConnectionRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });

      if (existingConnectionRequest) {
        return res
          .status(400)
          .json({ message: "Connection request already exists" });
      }

      // Create and save new request
      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });

      const savedRequest = await connectionRequest.save();

      return res.status(201).json({
        message: "Connection request sent successfully",
        request: savedRequest,
      });
    } catch (err) {
      console.error("Error while sending connection request:", err);
      res
        .status(500)
        .json({ message: "Internal server error", error: err.message });
    }
  }
);

requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const { status, requestId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(loggedInUser._id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }

      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Status not allowed" });
      }

      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });

      if (!connectionRequest) {
        return res
          .status(404)
          .json({ message: "Connection request not found" });
      }

      connectionRequest.status = status;
      const savedRequest = await connectionRequest.save();

      return res.status(200).json({
        message: "Connection request reviewed successfully",
        request: savedRequest,
      });
    } catch (err) {
      console.error("Error while reviewing connection request:", err);
      res.status(500).json({
        message: "Internal server error",
        error: err.message,
      });
    }
  }
);

module.exports = requestRouter;

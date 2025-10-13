const cron = require("node-cron");
const { subDays, startOfDay, endOfDay } = require("date-fns");
const ConnectionRequest = require("../models/connectionRequest");
const sendMail = require("./sendMail");
const User = require("../models/user");

cron.schedule("0 10 * * *", async () => {
  try {
    const yesterday = subDays(new Date(), 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    const pendingRequests = await ConnectionRequest.find({
      status: "interested",
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
    }).populate("fromUserId toUserId");

    const listOfEmails = pendingRequests.map((req) => req.toUserId.email);
    console.log("Pending connection requests emails:", listOfEmails);

    for (const email of listOfEmails) {
      try {
        await sendMail(
          email,
          "Pending connection requests",
          "You have pending connection requests. Please check your account.",
          "<p>You have pending connection requests. Please check your account.</p>"
        );
        console.log("Email sent successfully to", email);
      } catch (err) {
        console.log("Error sending email:", err);
      }
    }
  } catch (err) {
    console.log("Cron job error:", err);
  }
});

cron.schedule("45 23 * * *", async () => {
  try {
    const expiredUsers = await User.find({
      isPremium: true,
      membershipValidity: { $ne: null, $lt: new Date() },
    });

    for (const user of expiredUsers) {
      user.isPremium = false;
      user.membershipType = "basic";
      user.membershipValidity = null;
      await user.save();
      console.log(`Updated expired membership for ${user.email}`);
    }

    if (expiredUsers.length === 0) {
      console.log("No expired memberships found at this time.");
    }
  } catch (err) {
    console.error("Error updating expired memberships:", err);
  }
});


module.exports = cron;

const express = require("express");
const profileRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { validateEditProfileData,vlaidateNewPassword } = require("../utils/validation");
const bcrypt=require("bcrypt");

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new Error("server not respond");
    }
    res.send(user);
  } catch (err) {
    res.status(400).send("Something went wrong : " + err.message);
  }
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!validateEditProfileData(req)) {
      throw new Error("Invalid edit request");
    }
    const loggedInUser = req.user;
    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    await loggedInUser.save();
    res.json({
      message: `${loggedInUser.firstName}, your profile updated successfuly`,
      data: loggedInUser,
    });
  } catch (err) {
    res.status(400).send("Error : " + err.message);
  }
});

profileRouter.patch("/profile/changepassword",userAuth,async(req,res)=>{
    try{
        vlaidateNewPassword(req)
        const user=req.user;
        const newPassword=req.body.password
        if(!newPassword){
            throw new Error("Please Enter new password")
        }
        const hashPassword = await bcrypt.hash(newPassword, 10);
        user.password=hashPassword;
        await user.save();
        res.json({message: `${user.firstName}, your password updated successfuly`});
    }catch(err){
        res.status(400).send("Error : " + err.message);
    }
})
module.exports = profileRouter;

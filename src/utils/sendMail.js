const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = (to, subject, text, html) => {
  transporter
    .sendMail({
      from: `"DevTalk" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    })
    .then(() => console.log("Email sent successfully"))
    .catch((error) => console.error("Email send error:", error.message));
};

module.exports = sendMail;

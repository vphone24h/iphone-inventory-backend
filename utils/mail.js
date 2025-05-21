// backend/utils/mail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // dùng TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetPasswordEmail = async (toEmail, resetLink) => {
  const info = await transporter.sendMail({
    from: `"VPhone24h" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🔐 Yêu cầu đặt lại mật khẩu",
    html: `
      <p>Chào bạn,</p>
      <p>Bạn đã yêu cầu đặt lại mật khẩu. Bấm vào nút bên dưới để đặt lại:</p>
      <p><a href="${resetLink}" style="padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none;">Đặt lại mật khẩu</a></p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      <hr>
      <p>VPhone24h Team</p>
    `,
  });

  console.log("📧 Đã gửi email:", info.messageId);
};

module.exports = { sendResetPasswordEmail };

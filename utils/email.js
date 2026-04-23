const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === "465",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });
  }

  async sendEmail(options) {
    try {
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || options.message,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(
        `Email sent successfully to ${options.email}`,
        info.messageId
      );
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Email sending failed:", error.message);
      // Don't throw - allow app to continue even if email fails
      return { success: false, error: error.message };
    }
  }

  async sendPasswordReset(email, resetCode) {
    const message = `Your password reset code is: ${resetCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Your password reset code is:</p>
        <h1 style="background: #f4f4f4; padding: 20px; text-align: center; letter-spacing: 5px;">${resetCode}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    return this.sendEmail({
      email,
      subject: "Password Reset Code - Gate Buddy",
      message,
      html,
    });
  }
}

module.exports = new EmailService();

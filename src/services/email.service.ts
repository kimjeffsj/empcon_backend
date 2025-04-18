import nodemailer from "nodemailer";
import { logger } from "@/common/utils/logger.utils";
import { NotificationType } from "@prisma/client";

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * General email notification
   */
  async sendNotificationEmail(
    to: string,
    subject: string,
    message: string,
    type: NotificationType
  ) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@empcon.com",
        to,
        subject,
        html: this.generateEmailTemplate(subject, message, type),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}`, { messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error("Error sending email:", error);
      throw error;
    }
  }

  /**
   * Schedule change email
   */
  async sendScheduleChangeNotification(
    to: string,
    userName: string,
    scheduleDetails: any
  ) {
    const subject = "Schedule Change Notification";
    const message = `Dear ${userName}, your schedule has been updated. Please check the details in your account.`;

    return this.sendNotificationEmail(to, subject, message, "SCHEDULE_CHANGE");
  }

  /**
   * Leave request email update
   */
  async sendLeaveRequestUpdateNotification(
    to: string,
    userName: string,
    status: string,
    leaveDetails: any
  ) {
    const subject = `Leave Request ${status}`;
    const message = `Dear ${userName}, your leave request from ${new Date(
      leaveDetails.startDate
    ).toLocaleDateString()} to ${new Date(
      leaveDetails.endDate
    ).toLocaleDateString()} has been ${status.toLowerCase()}.`;

    return this.sendNotificationEmail(to, subject, message, "LEAVE_UPDATE");
  }

  /**
   * Create email template
   */
  private generateEmailTemplate(
    subject: string,
    message: string,
    type: NotificationType
  ): string {
    // HTML template
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3f51b5; color: white; padding: 10px 20px; }
          .content { padding: 20px; border: 1px solid #eee; }
          .footer { font-size: 12px; color: #777; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${subject}</h2>
          </div>
          <div class="content">
            <p>${message}</p>
            <p>Please log in to your account to view more details.</p>
            <p><a href="${
              process.env.FRONTEND_URL || "http://localhost:3000"
            }">Go to EmpCon</a></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} EmpCon. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

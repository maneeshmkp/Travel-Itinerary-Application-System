import nodemailer from "nodemailer"

// Create transporter for Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
    },
  })
}

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `Travel Itinerary <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Link - Travel Itinerary",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            
            <h2 style="color: #0066cc; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
              Or copy and paste this link in your browser:
            </p>
            
            <p style="color: #0066cc; word-break: break-all; font-size: 12px; background-color: #f9f9f9; padding: 10px; border-radius: 3px;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
              <strong>⏱️ This link will expire in 30 minutes.</strong>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
              If you didn't request a password reset, please ignore this email or contact support immediately.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              © 2025 Travel Itinerary System. All rights reserved.
            </p>
          </div>
        </div>
      `,
    }

    const result = await transporter.sendMail(mailOptions)
    return { success: true, message: "Email sent successfully", messageId: result.messageId }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, message: error.message }
  }
}

// Send welcome email
export const sendWelcomeEmail = async (email, userName) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `Travel Itinerary <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to Travel Itinerary!",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            
            <h2 style="color: #0066cc; margin-bottom: 20px;">Welcome, ${userName}! 🎉</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              Thank you for creating an account with Travel Itinerary. We're excited to help you plan your next adventure!
            </p>
            
            <div style="background-color: #f0f7ff; padding: 20px; border-left: 4px solid #0066cc; margin: 20px 0;">
              <h3 style="color: #0066cc; margin-top: 0;">What you can do:</h3>
              <ul style="color: #333; line-height: 1.8;">
                <li>Create custom travel itineraries</li>
                <li>Organize activities by day</li>
                <li>Get personalized recommendations</li>
                <li>Share your itineraries with others</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              If you have any questions or need assistance, feel free to reach out to our support team.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              © 2025 Travel Itinerary System. All rights reserved.
            </p>
          </div>
        </div>
      `,
    }

    const result = await transporter.sendMail(mailOptions)
    return { success: true, message: "Welcome email sent", messageId: result.messageId }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, message: error.message }
  }
}

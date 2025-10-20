import { sendEmail } from "./sendEmail.js";
import { generateVerificationCode } from "./generateVerificationCode.js";
import { Verification } from "../models/user.js";

export async function sendVerificationMail(user) {
  try {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // expires in 5 mins

    // delete old codes for same user
    await Verification.deleteMany({ userId: user._id });

    // store new verification record
    await Verification.create({ userId: user._id, code, expiresAt });

    // send mail
    await sendEmail(
      user.email,
      `Your verification code is ${code}. Please do not share this with anyone.`
    );

    return true; // success indicator
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

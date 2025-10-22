import { sendEmail } from "./sendEmail.js";
import { generateVerificationCode } from "./generateVerificationCode.js";
import { Verification } from "../models/user.js";

export async function sendVerificationMail(user, is_dummy = true) {
  try {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // expires in 5 mins

    // delete old codes for same user
    await Verification.deleteMany({ userId: user._id });

    // store new verification record
    await Verification.create({ userId: user._id, code, expiresAt });

    // only send mail when not dummy else just return the token for testing sake
    if (!is_dummy) {
      console.log("recepient iemail:", user.email);
      await sendEmail(
        user.email,
        "Email Confirmation",
        `Your verificaxtion code is ${code}. Please do not share this with anyone.`
      );
    }
    return { token: code };
    // return true; // success indicator
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

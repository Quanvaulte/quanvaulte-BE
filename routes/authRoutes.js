import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import express from "express";
import User, { Verification } from "../models/user.js";
import authMiddleware, { createToken } from "../middlewares/authMiddleware.js";
import { generateVerificationCode } from "../utils/generateVerificationCode.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendVerificationMail } from "../utils/sendVerificationMail.js";

const router = express.Router();

// registration flow
// register (user.is_active=false, trigger sending confirm token) > confirm email (token sent to email) -user.is_active=true > login screen

// reset password flow
// forgotten password (registered email) > confirm email (token sent to email) (same as above confirm)> password reset screen (new_password) > success

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication management
 */

// create auth routes
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             example:
 *               name: "clement Aboy"
 *               email: "clement@gmail.com"
 *               is_admin: false
 *               password: "password123"
 *     responses:
 *       201:
 *         description: User registered successfully
 * */

// register user
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ msg: "Please provide name, email and password" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      ...req.body,
      last_name: name.split(" ")[0],
      first_name: name.split(" ")[1],
      password: password,
      is_active: false, //user will need to confirm thier email b4 this is true
    });

    // send email confirmation to mail
    await sendVerificationMail(user);
    res.status(201).json({
      msg: "user created, check mail for email confirmation",
      userId: user.id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error", error });
  }
});
/**
 * @swagger
 * /auth/confirm-email/{userId}:
 *   post:
 *     summary: Confirm user's email using a verification token
 *     description: Verifies the email address of a user by matching the verification token sent to their email. Activates the user's account if valid.
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose email is being verified
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "A7X9ZT"
 *                 description: The 6–8 character verification code sent to the user's email
 *     responses:
 *       200:
 *         description: Email confirmed successfully. The user's account is now active.
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error during verification
 */
router.post("/confirm-email/:userId", async (req, res) => {
  try {
    const { token } = req.body;
    const { userId } = req.params;

    // Check for matching verification record
    const record = await Verification.findOne({ userId, code: token });

    if (!record || record.expiresAt < Date.now()) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    // Activate the user
    await User.findByIdAndUpdate(userId, { is_active: true });

    // Optionally delete the verification record to prevent reuse
    await Verification.deleteOne({ _id: record._id });

    res.status(200).json({ msg: "Token verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Verification failed", error: error.message });
  }
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication management
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "clement@gmail.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *       401:
 *         description: Unauthorized (invalid credentials)
 */
// login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ msg: "Please provide email and password" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ msg: "invalid credentials" });
    const compare_pswd = await bcrypt.compare(password, user.password);
    if (!compare_pswd) {
      return res.status(401).json({ msg: "invalid credentials" });
    }

    // generate token
    const token = createToken(user);
    res.status(200).json({ msg: "login successfully", token: token });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error });
  }
});

// forget and password reset flows using 6-8 character token (not url token) sent to user email
/**
 * @swagger
 * /api/v2/auth/forgot-password:
 *   post:
 *     summary: Request password reset, recieve token in email
 *     description: Endpoint to request for password reset, email is required
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             example:
 *               email: "clement@gmail.com"
 *     responses:
 *       200:
 *         description: reset token sent to email
 *       400:
 *         description: request email does not exist

 * */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Email does not exist" });
    }

    await sendVerificationMail(user);

    res.status(200).json({ msg: "Check your email for verification code" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "An error occurred", error: error.message });
  }
});

/**
 * @swagger
 * /api/v2/auth/reset-password/{email}:
 *   post:
 *     summary: Reset password, identify associated user with token or email
 *     description: Endpoint that does the actual password reset using the token sent to the user's email.
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         description: user's email for password reset
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: "to God be the Glory"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 msg: "password reset successful"
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 err: "Invalid or expired token"
 */

// password reset
router.post("/reset-password/:email", async (req, res) => {
  console.log("password reset route hit");
  // const { token } = req.params; //email will be more robust as some user's token might not exist or is expired
  const { password } = req.body;
  const { email } = req.params;

  try {
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // const user = await User.findById(decoded.id);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "invalid user" });
    }
    user.password = password;
    await user.save();
    res.status(200).json({ msg: "password reset successfull" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(400)
        .json({ err: "token has expired, pls request new reset link" });
    }
    res.status(400).json({ err: "Invalid or expired token" });
  }
});

// forget and password reset flows using tokenized url sent to user email
/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Endpoint to request for password reset, email is required
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             example:
 *               email: "clement@gmail.com"
 *     responses:
 *       200:
 *         description: reset link sent to email
 *       400:
 *         description: request email does not exist

 * */
// forget password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "email does not exist" });
  }

  const token = createToken(user, 11);
  const reset_link = `${req.protocol}://${req.get(
    "host"
  )}/auth/reset-password/${token}`;

  // display link on console for now
  console.log("password request processed, reset link=", reset_link);
  // send email
  res.status(200).json({ msg: "check email for reset link" });
});

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password with a unique token appended in the URL
 *     description: Endpoint that does the actual password reset using the token sent to the user's email.
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: JWT token sent to user's email for password reset
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: "to God be the Glory"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 msg: "password reset successful"
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 err: "Invalid or expired token"
 */

// password reset
router.post("/reset-password/:token", async (req, res) => {
  console.log("password reset route hit");
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ error: "invalid user" });
    }
    user.password = password;
    await user.save();
    res.status(200).json({ msg: "password reset successfull" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(400)
        .json({ err: "token has expired, pls request new reset link" });
    }
    res.status(400).json({ err: "Invalid or expired token" });
  }
});

export default router;

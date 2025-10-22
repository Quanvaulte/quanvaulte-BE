import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { sendVerificationMail } from "../utils/sendVerificationMail.js";
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
});

const Group = mongoose.model("Group", groupSchema);

const permissionsSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const Permission = mongoose.model("Permission", permissionsSchema);

const userSchema = new mongoose.Schema(
  {
    username: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false, required: true },
    first_name: { type: String },
    last_name: String,
    is_active: Boolean,
    is_staff: Boolean,
    is_superuser: Boolean,
    last_login: Date,

    // relationships
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    user_permissions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "permission" },
    ],
  },
  { timestamps: true }
);

// create a compound unique index
userSchema.index({ first_name: 1, last_name: 1 }, { unique: true });

// used to hash reset password, turn out to work even when not password changed
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    console.log("new user request no password update");
    return next();
  }
  console.log("password reset request made");
  this.password = await bcrypt.hash(this.password, 10);
  this.is_new = true; //temp field used to check if user is just created, it exist only in memory not in db
  next();
});

// post save hook to send email confirmation
userSchema.post("save", async function (doc, next) {
  console.log("hello from post save hook, isNew:", doc.is_new);
  // check if new user
  if (doc.is_new && doc.is_active == false) {
    console.log("new user created");
    sendVerificationMail(doc, false)
      .then((token) => console.log("token is:", token))
      .catch((err) => console.log(err));
  }
  doc.is_new = false;
  next();
});
// user profile schema

const User = mongoose.model("User", userSchema);
export default User;

const verificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// this automatically delete token after expiration
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Verification = mongoose.model("Verification", verificationSchema);

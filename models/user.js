import mongoose from "mongoose";

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

// used to hash reset password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// user profile schema

const User = mongoose.model("User", userSchema);
export default User;

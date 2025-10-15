import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export default authMiddleware = (req, res, next) => {
  // check for token in headers
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "unauthorized, no token" });

  // valify user in token exist
  try {
    const decoded = jwt.decode(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ msg: "unauthorized, invalid/expired token" });
  }
};

// create jwt token
export const createToken = (user, is_password_reset_token = 0) => {
  if (is_password_reset_token) {
    console.log("create token for pswd reset called");
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET,
      { expiresIn: `${is_password_reset_token}m` }
    );
  }

  // else block
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET
  );
};

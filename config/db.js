import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export default connectDb = () => {
  mongoose
    .connnect(process.env.MONGO_URI)
    .then(() => console.log("MongoDb connected"))
    .catch((err) => console.log(err));
};

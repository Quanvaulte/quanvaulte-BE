import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { swaggerUi, swaggerSpec } from "./swagger.js";
import connectDb from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";

dotenv.config();
connectDb();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// authentication routes
app.use("/auth", authRoutes);

// app.listen(process.env.PORT, () =>
//   console.log("server running on port", process.env.PORT)
// );

// // running on local ip
// app.listen(5000, "0.0.0.0", () => console.log("running on local ip"));

// for compactibility with vercel
export default app;

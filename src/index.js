import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import { connectDB } from "./lib/db.js";
import job from "./lib/cron.js";

const app = express();
const PORT = process.env.PORT || 3000

//job.start(); 
app.use(express.json());
app.use(cors());
// app.use(express.json({ limit: "10mb" })); // Increase to 10MB
// app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/auth", authRoutes)
app.use("/api/books", bookRoutes);
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});
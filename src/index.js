import "./env.js";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static(path.resolve("public")));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Welcome to Easily the Job Board API!");
});

import userRouter from "./routes/user.routes.js";
import companyRouter from "./routes/company.routes.js";
import jobRouter from "./routes/jobs.routes.js";

app.use("/api/user", userRouter);
app.use("/api/company", companyRouter);
app.use("/api/job", jobRouter);

export default app;

import "./env.js";

import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";
import connectToDB from "./config/mongodb.js";
const app = express();

import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

// Load the YAML file
const swaggerDocument = YAML.load(path.resolve("src", "swagger.yaml"));

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

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req, res) => {
  res.send("Welcome to Easily the Job Board API!");
});

import userRouter from "./routes/user.routes.js";
import companyRouter from "./routes/company.routes.js";
import jobRouter from "./routes/jobs.routes.js";

app.use("/api/user", userRouter);
app.use("/api/company", companyRouter);
app.use("/api/job", jobRouter);

const PORT = process.env.PORT;

connectToDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`⚙️ Server is running at port --> ${process.env.PORT}`);
    });
    server.on("error", (error) => {
      console.log("😵‍💫 Error in Server ON --> ", error);
      throw error;
    });
  })
  .catch((err) => {
    console.log("😵‍💫 MONGODB Conection Failed in Server.js --> ", err);
  });

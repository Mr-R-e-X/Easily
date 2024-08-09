import mongoose from "mongoose";
import { DB_NAME } from "../utils/constants.js";

const connectToDB = async () => {
  try {
    const connectionInstace = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n🥁MongoDB connected!! DB Host: ${connectionInstace.connection.host}. \n ${connectionInstace.connection.name} `
    );
  } catch (error) {
    console.log("😵‍💫MongoDB connection FAILED: ", error);
    process.exit(1);
  }
};

export default connectToDB;

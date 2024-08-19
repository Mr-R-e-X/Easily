import app from "./index.js";
import connectToDB from "./config/mongodb.js";

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

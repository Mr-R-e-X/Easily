import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
export async function uploadDataInCloudinary(filePath) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    if (!filePath) return null;
    const response = await cloudinary.uploader
      .upload(filePath, { resource_type: "auto" })
      .catch((error) => {
        console.log(error);
      });
    fs.unlinkSync(filePath);
    return response;
  } catch (error) {
    console.log(error);
    fs.unlinkSync(filePath);
    return null;
  }
}

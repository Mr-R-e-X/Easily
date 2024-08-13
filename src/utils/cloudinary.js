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

export async function destroyFromCloudinary(filePath) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    if (!filePath) return null;
    const urlParts = filePath.split("/");
    const publicIdWithExtension = urlParts.slice(-1).join("");
    const publicId = publicIdWithExtension.split(".")[0];
    const data = await cloudinary.uploader.destroy(publicId, {
      type: "upload",
    });
    if (data.result === "not found") {
      console.warn(`File not found: ${publicId}`);
      return data;
    }
    console.log(data, publicId);
  } catch (error) {
    console.log(error);
  }
}

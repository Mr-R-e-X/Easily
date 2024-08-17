import { ApiError } from "./apiError.js";

export const generateAccessAndRefreshToken = async (model, id) => {
  try {
    const db = await model.findById(id);
    const accessToken = await company.generateAccessToken();
    const refreshToken = await company.generateRefreshToken();
    db.refreshToken = refreshToken;
    await db.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};

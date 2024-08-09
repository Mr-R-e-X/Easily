import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadDataInCloudinary } from "../utils/cloudinary.js";
import { COOKIE_OPTIONS } from "../utils/constants.js";
import crypto from "crypto";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  console.table([name, email, password]);
  if ([name, email, password].some((feild) => feild.trim() === ""))
    throw new ApiError(400, "All fields are required");

  const existUser = await User.findOne({ email });

  if (existUser) throw new ApiError(400, "Email already exists");

  let avatarLocalFilePath = req.files?.avatar[0]?.path;

  if (!avatarLocalFilePath) throw new ApiError(400, "Avatar is required");

  const avatarImagePath = await uploadDataInCloudinary(avatarLocalFilePath);

  let coverImagePath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    let localCoverImageFilePath = req.files.coverImage[0].path;
    coverImagePath = await uploadDataInCloudinary(localCoverImageFilePath);
  }

  const user = await User.create({
    name,
    email,
    password,
    avatar: avatarImagePath.url,
    coverImage: coverImagePath.url || "",
  });

  const createdUser = await User.findById(user?._id).select(
    "-password -resume -address -experience -bio -education -savedJobs -appliedJobs -givenRatingsAndReviews -refreshToken"
  );

  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering the user");

  return res
    .status(200)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const foundUser = await User.findOne({ email });
  if (!foundUser) throw new ApiError(404, "User not found");
  const isPasswordValid = await foundUser.isPasswordValid(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid password");
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    foundUser._id
  );
  const loggedInUser = await User.findById(foundUser._id).select(
    "-password -resume -address -experience -bio -education -savedJobs -appliedJobs -givenRatingsAndReviews -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToeken", accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
    .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

const verifyEmailOTP = asyncHandler(async (req, res) => {
  
});

const forgotPassword = asyncHandler(async (req, res) => {});

const updatePassword = asyncHandler(async (req, res) => {});

const updateUserDetails = asyncHandler(async (req, res) => {});

const logout = asyncHandler(async (req, res) => {});

const giveCompanyRating = asyncHandler(async (req, res) => {});

const refreshAccessToken = asyncHandler(async (req, res) => {});

export {
  registerUser,
  login,
  forgotPassword,
  updatePassword,
  updateUserDetails,
  logout,
  giveCompanyRating,
  refreshAccessToken,
};

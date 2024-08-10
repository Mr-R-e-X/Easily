import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadDataInCloudinary } from "../utils/cloudinary.js";
import { COOKIE_OPTIONS } from "../utils/constants.js";
import { generateRandomOtp } from "../utils/generateOtp.js";
import { UserOTP } from "../models/userOtp.model.js";
import { sendMailFunction } from "../utils/nodemailer.js";
import mongoose from "mongoose";

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
    .cookie("accessToken", accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
    .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

const sendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const registeredEmail = req.user?.email;

  if (!email) throw new ApiError(401, "Email is required");
  if (!(email.toLowerCase() == registeredEmail))
    throw new ApiError(401, "Unauthorized email");
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  if (user.isEmailVerified) throw new ApiError(401, "Email already verified");
  const otp = generateRandomOtp();

  let checkPrevOtp = await UserOTP.findOne({ userId: user._id });
  if (!checkPrevOtp) {
    const mail = await sendMailFunction(
      email,
      "Email Verification",
      `<h1>Hi,</h1><h1>Your OTP is <strong>${otp}</strong></h1>`
    );
    console.log("MAIL: " + mail);
    await UserOTP.create({ userId: user._id, otp: otp });
    return res
      .status(200)
      .json(new ApiResponse(201, otp, "Otp send successfully"));
  }
  const mail = await sendMailFunction(
    email,
    "Email Verification",
    `<h1>Hi,</h1><h1>Your OTP is <strong>${otp}</strong></h1>`
  );
  console.log("MAIL: " + mail);

  checkPrevOtp.otp = otp;
  checkPrevOtp.createdAt = Date.now();
  await checkPrevOtp.save();

  return res
    .status(200)
    .json(new ApiResponse(200, otp, "otp send successfully"));
});

const verifyEmailOTP = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp) throw new ApiError(400, "OTP is required");
  const { ObjectId } = mongoose.Types;

  const checkUser = await UserOTP.findOne({ userId: req.user?._id });

  if (!checkUser) throw new ApiError(400, "Unauthorzed request");
  const comparedValue = await checkUser.compareOtp(otp);
  if (!comparedValue) throw new ApiError(401, "Invalid OTP");
  const user = await User.findByIdAndUpdate(
    { _id: new ObjectId(req.user?._id) },
    {
      $set: { isEmailVerified: true },
    },
    { new: true }
  ).select(
    "-password -resume -address -experience -bio -education -savedJobs -appliedJobs -givenRatingsAndReviews -refreshToken"
  );
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Email verified successfully"));
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
  sendVerificationEmail,
  verifyEmailOTP,
  forgotPassword,
  updatePassword,
  updateUserDetails,
  logout,
  giveCompanyRating,
  refreshAccessToken,
};

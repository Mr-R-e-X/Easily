// import from external package
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
// import from model
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { Job } from "../models/jobs.model.js";
import { Application } from "../models/application.model.js";
import { UserOTP } from "../models/userOtp.model.js";
// import from utils
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  destroyFromCloudinary,
  uploadDataInCloudinary,
} from "../utils/cloudinary.js";
import { COOKIE_OPTIONS } from "../utils/constants.js";
import { generateRandomOtp } from "../utils/generateOtp.js";
import { sendMailFunction } from "../utils/nodemailer.js";

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
      .json(new ApiResponse(201, otp, "OTP send successfully"));
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

const updateUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?.id);
  if (!user) throw new ApiError(404, "Invalid User");
  const isPasswordValid = await user.isPasswordValid(oldPassword);
  if (!isPasswordValid) throw new ApiError(401, "Invalid Old Password");
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Sucessfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { name, bio, experience, education, currentlyWorkingAt, address } =
    req.body;
  const user = await User.findById(req.user._id);
  let newAvatarCloudinaryPath;
  let newCoverImageCloudinaryPath;
  let newResumeCloudinaryPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    if (user.avatar.length > 0) await destroyFromCloudinary(user.avatar);
    let newAvatarLocalFilePath = req.files.avatar[0].path;
    newAvatarCloudinaryPath = await uploadDataInCloudinary(
      newAvatarLocalFilePath
    );
  }
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    if (user.coverImage.length > 0)
      await destroyFromCloudinary(user.coverImage);
    let newCoverImageLocalFilePath = req.files.coverImage[0].path;
    newCoverImageCloudinaryPath = await uploadDataInCloudinary(
      newCoverImageLocalFilePath
    );
  }
  if (
    req.files &&
    Array.isArray(req.files.resume) &&
    req.files.resume.length > 0
  ) {
    if (user.resume.length > 0) await destroyFromCloudinary(user.resume);
    let newResumeLocalFilePath = req.files.resume[0].path;
    newResumeCloudinaryPath = await uploadDataInCloudinary(
      newResumeLocalFilePath
    );
  }
  let updates = {};
  if (name && name.trim() !== "") updates.name = name;
  if (bio && bio.trim() !== "") updates.bio = bio;
  if (currentlyWorkingAt && currentlyWorkingAt.trim() !== "")
    updates.currentlyWorkingAt = currentlyWorkingAt;
  if (address && address.trim() !== "") updates.address = address;

  if (education && Array.isArray(education) && education.length > 0) {
    updates.$push = { education: { $each: education } };
  }
  if (experience && Array.isArray(experience) && experience.length > 0) {
    updates.$push = { experience: { $each: experience } };
  }

  if (newAvatarCloudinaryPath !== undefined)
    updates.avatar = newAvatarCloudinaryPath.url;

  if (newCoverImageCloudinaryPath !== undefined)
    updates.coverImage = newCoverImageCloudinaryPath.url;

  if (newResumeCloudinaryPath !== undefined)
    updates.resume = newResumeCloudinaryPath.url;
  // console.log(updates);
  if (Object.keys(updates).length == 0) {
    throw new ApiError(400, "Invalid Updates");
  }
  const updatedUser = await User.findByIdAndUpdate(
    { _id: req.user?._id },
    updates,
    { new: true }
  ).select(
    "-password -savedJobs -appliedJobs -givenRatingsAndReviews -refreshToken"
  );

  return res
    .status(200)
    .json(new ApiResponse(201, updatedUser, "User updated successfully"));
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", COOKIE_OPTIONS)
    .clearCookie("refreshToken", COOKIE_OPTIONS)
    .json(new ApiResponse(200, {}, "User logged out successfully!"));
});

const applyForJob = asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  const checkForJob = await Job.findById(jobId);
  if (!checkForJob) throw new ApiError(400, "Job not found");
  const user = await User.findById(req.user?._id);
  const applicatonDtls = { jobId, candidateId: user._id };
  let application = await Application.findOne(applicatonDtls);
  if (!application) {
    await Application.create({
      $set: {
        jobId,
        candidateId: user._id,
        resumeLink: user.resume,
      },
    });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Successfully Applied for the Job!"));
  }
  return res
    .status(200)
    .json(new ApiResponse(409, {}, "Already applied for the Job!"));
});

const savedJobs = asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  const jobDtls = await Job.findById(jobId);
  if (!jobDtls) throw new ApiError(404, "Job not found");
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $push: {
      savedJobs: jobDtls._id,
    },
  }).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Job Successfully svaed for future"));
});

const removeJobFromSavedJob = asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  const jobDtls = await Job.findById(jobId);
  if (!jobDtls) throw new ApiError(404, "Job not found");
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $pull: {
      savedJobs: jobDtls._id,
    },
  }).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Job removed from saved jobs"));
});

const giveCompanyRatingAndReview = asyncHandler(async (req, res) => {
  const { comapanyId, rating, review } = req.body;
  if (!comapanyId || !rating || !review)
    throw new ApiError(400, "Invalid Inputs");
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(400, "Unauthorized Request");
  const company = await Company.findById(comapanyId);
  if (!company) throw new ApiError(400, "Company not found");
  const existingRatingAndReview = user.givenRatingsAndReviews.findIndex(
    (reviews) => reviews.company === comapanyId
  );
  if (existingRatingAndReview !== -1) {
    user.givenRatingsAndReviews[existingRatingAndReview].rating = rating;
    user.givenRatingsAndReviews[existingRatingAndReview].review = review;
    await user.save();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user.givenRatingsAndReviews[existingRatingAndReview],
          "Rating updated successfully"
        )
      );
  }
  user.givenRatingsAndReviews.push({
    company: comapanyId,
    rating: rating,
    review: review,
  });
  await user.save();
  return res.status(200).json(new ApiResponse(201, {}));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(404, "Unauthorized Request");
  try {
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedRefreshToken?._id);
    if (!user) throw new ApiError(401, "Invalid Refresh Token");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user?._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, COOKIE_OPTIONS)
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .json(
        new ApiResponse(201, { accessToken, refreshToken }, "Token Refreshed")
      );
  } catch (error) {
    throw new ApiError(404, error?.message || "Invalid Refresh Token");
  }
});

export {
  registerUser,
  login,
  sendVerificationEmail,
  verifyEmailOTP,
  updateUserPassword,
  updateUserDetails,
  logout,
  giveCompanyRatingAndReview,
  refreshAccessToken,
  applyForJob,
  savedJobs,
  removeJobFromSavedJob,
};

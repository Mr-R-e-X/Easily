// import from external package
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
// import from model
import { Company } from "../models/company.model.js";
import { CompanyOTP } from "../models/companyOtp.model.js";
import { Job } from "../models/jobs.model.js";
import { Application } from "../models/application.model.js";
import { Admin } from "../models/companyAdmin.model.js";
// import from util
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
import { generateAccessAndRefreshToken } from "../utils/generateJwtTokens.js";
import { AdminOTP } from "../models/adminOtp.model.js";

const loginAsAdmin = asyncHandler(async (req, res) => {
  const { adminEmail, adminPassword, adminId } = req.body;
  if (!adminEmail && !adminId)
    throw new ApiError(401, "Admin Email and Id is required");
  if (!adminPassword) throw new ApiError(401, "Admin Password is invalid");
  const admin = await Admin.findOne({ adminEmail, adminId });
  if (!admin) throw new ApiError(401, "Admin not found");
  const isMatch = await admin.comparePassword(adminPassword);
  if (!isMatch) throw new ApiError(401, "Incorrect password");
  const company = await Company.findById(admin.company);
  if (!company) throw new ApiError(404, "Company Not Found");
  if (!company.adminDept.find((admin) => admin._id === admin._id))
    throw new ApiError(401, "Authorization Revoked");
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    Admin,
    admin._id
  );
  const loggedInAdmin = await Admin.findById(admin._id).select(
    "-adminPassword"
  );
  return res
    .status(200)
    .cookie("accessToken", accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
    .json(
      new ApiResponse(200, loggedInAdmin, "Logged in successfully as a Admin")
    );
});

const logoutAdmin = asyncHandler(async (req, res) => {
  await Admin.findById({ _id: req.admin?._id });
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

const sendVerificationAdminEmail = asyncHandler(async (req, res) => {
  const { adminEmail } = req.admin;
  const admin = await Admin.findById(req.admin?._id);
  if (!admin) throw new ApiError(404, "Admin not found");
  if (admin.idEmailVerified)
    throw new ApiError(400, "Admin email is already verified");
  const otp = generateRandomOtp();
  const checkPreviousOtp = await AdminOTP.findOne({ adminId: admin._id });
  const mail = await sendMailFunction(
    adminEmail,
    "Email Verification",
    `<h1>Hi,</h1><h1>Your OTP is <strong>${otp}</strong></h1>`
  );
  console.log("Mail : ", mail);
  if (!checkPreviousOtp) {
    await AdminOTP.create({ adminId: admin._id, otp });
    return res
      .status(200)
      .json(new ApiResponse(201, otp, "OTP send seccessfully"));
  }
  checkPreviousOtp.otp = otp;
  checkPreviousOtp.createdAt = Date.now();
  await checkPreviousOtp.save();
  return res
    .status(200)
    .json(new ApiResponse(201, otp, "Otp resended successfully"));
});

const verifyAdminEmail = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp) throw new ApiError(404, "No OTP found");
  const admin = await Admin.findById(req.admin?._id);
  const checkPreviousOtp = await AdminOTP.findOne({ adminId: req.admin?._id });
  const checkOtp = checkPreviousOtp.compareOtp(otp);
  if (!checkOtp) throw new ApiError(404, "Invalid OTP");
  admin.idEmailVerified = true;
  await admin.save();
  await AdminOTP.findByIdAndDelete(checkPreviousOtp._id);
  return res
    .status(200)
    .json(new ApiResponse(200, "Email Verified Successfully"));
});

const postJobAsAdmin = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    location,
    employmentType,
    skills,
    numberOfVacancies,
    requirements,
    responsibilities,
    salaryRange,
  } = req.body;

  if (
    !title ||
    !description ||
    !location ||
    !employmentType ||
    !numberOfVacancies ||
    !requirements ||
    !responsibilities
  ) {
    throw new ApiError(400, "All fields are required");
  }
  if (!skills && skills.length === 0) {
    throw new ApiError(400, "Skills are required");
  }

  const newJob = await Job.create({
    title,
    description,
    location,
    employmentType,
    skills,
    numberOfVacancies,
    requirements,
    responsibilities,
    salaryRange: salaryRange || "Not Disclosed",
    companyRef: req.admin.company,
  });

  const { ObjectId } = mongoose.Types;

  await Company.findByIdAndUpdate(
    { _id: new ObjectId(req.admin?.company) },
    { $push: { jobsPosted: newJob._id } },
    { new: true }
  );

  await Admin.findByIdAndUpdate(
    { _id: new ObjectId(req.admin?._id) },
    { $push: { postedJobs: newJob._id } }
  );

  return res
    .status(200)
    .json(new ApiResponse(201, newJob, "Job created successfully"));
});

const deleteAdminPostedJob = asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  const job = await Job.findById(jobId);
  if (!job) throw new ApiError(404, "Job not found");
});

const refreshAdminAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new ApiError(401, "No refresh token provided");
  try {
    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const admin = await Admin.findById(decodedToken?._id);
    if (!admin) throw new ApiError(401, "Invalid refresh token");
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      Admin,
      admin._id
    );
    return res
      .status(200)
      .cookie("accessToken", accessToken, COOKIE_OPTIONS)
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .json(new ApiResponse(200, admin, "Access token refreshed successfully"));
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

export { loginAsAdmin, logoutAdmin, refreshAdminAccessToken };

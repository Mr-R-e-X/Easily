// import from external package
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
// import from model
import { Company } from "../models/company.model.js";
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

const generateAccessAndRefreshToken = async (companyId) => {
  try {
    const company = Company.findById(companyId);
    const accessToken = await company.generateAccessToken();
    const refreshToken = await company.generateRefreshToken();
    company.refreshToken = refreshToken;
    await company.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};

const checkUrl = async (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

const registerCompany = asyncHandler(async (req, res) => {
  const { name, email, password, contactNumber, website, description } =
    req.body;
  const checkForExistingCompany = await Company.findOne({
    name,
    email,
    contactNumber,
  });
  if (checkForExistingCompany)
    throw new ApiError(400, "Company already exists");

  const company = await Company.create({
    name,
    email,
    password,
    contactNumber,
    website,
    description,
  }).select("-password -verificationDocuments");

  return res
    .status(200)
    .json(
      new ApiResponse(201, { company }, "Company account created successfully")
    );
});

const loginAsCompany = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const company = await Company.findOne({ email });
  if (!company) throw new ApiError(400, "Company not found");
  const matchPassword = company.isPasswordValid(password);
  if (!matchPassword) throw new ApiError(400, "Invalid password");
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    company._id
  );
  const loggedInCompany = await Company.findById(company._id).select(
    "-password -verificationDocuments -refreshToken"
  );
  return res
    .status(200)
    .cookie("accessToken", accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
    .json(
      new ApiResponse(
        200,
        { company: loggedInCompany },
        "Logged in successfully"
      )
    );
});

const updateCompanyDetails = asyncHandler(async (req, res) => {
  const { contactNumber, website, estd, description, socialLinks } = req.body;
  let logoCloudinaryPath;
  let companyImagesCloudinaryPaths = [];
  let updates = {};
  const company = await Company.findById(req.company?._id);
  if (!company) throw new ApiError(400, "Unauthorized");
  if (contactNumber && contactNumber.trim().length === 10)
    updates.contactNumber = contactNumber;
  if (website && checkUrl(website)) updates.website = website;
  if (estd) updates.estd = estd;
  if (description && description.trim().length >= 50)
    updates.description = description;
  if (socialLinks && Array.isArray(socialLinks) && socialLinks.length > 0)
    updates.$push = { socialLinks: { $each: socialLinks } };

  if (req.files && Array.isArray(req.files.logo) && req.files.logo.length > 0) {
    if (company.logo.length > 0) await destroyFromCloudinary(company.logo);
    let localLogoPath = req.files.logo[0].path;
    logoCloudinaryPath = await uploadDataInCloudinary(localLogoPath);
  }
  if (
    req.files &&
    Array.isArray(req.files.companyImages) &&
    req.files.companyImages > 0
  ) {
    companyImagesCloudinaryPaths = await Promise.all(
      req.files.companyImages.map(async (images) => {
        let path = await uploadDataInCloudinary(images.path);
        return path.url;
      })
    );
  }
  if (companyImagesCloudinaryPaths.length > 0) {
    updates.$push = { companyImages: { $each: companyImagesCloudinaryPaths } };
  }
  if (logoCloudinaryPath !== undefined) updates.logo = logoCloudinaryPath.url;
  if (Object.keys(updates).length == 0) {
    throw new ApiError(400, "Invalid Updates");
  }

  const updateCompanyDetails = await Company.findByIdAndUpdate(
    { _id: req.company?._id },
    updates,
    { new: true }
  ).select("-password -verificationDocuments -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { company: updateCompanyDetails },
        "Company details updated successfully"
      )
    );
});

const getCompanyVerificationDocuments = asyncHandler(async (req, res) => {});

const updateCompanyVerificationStatus = asyncHandler(async (req, res) => {});

const verifyCompanyEmail = asyncHandler(async (req, res) => {});

const giveAdminAccess = asyncHandler(async (req, res) => {});

const postNewJob = asyncHandler(async (req, res) => {});

const getApplicantsDetails = asyncHandler(async (req, res) => {});

export {
  registerCompany,
  loginAsCompany,
  updateCompanyDetails,
  getCompanyVerificationDocuments,
  updateCompanyVerificationStatus,
  verifyCompanyEmail,
  giveAdminAccess,
  postNewJob,
  getApplicantsDetails,
};

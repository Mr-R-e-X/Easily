import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { Admin } from "../models/companyAdmin.model.js";

export const verifyUserJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization").replace("Bearer", "");
    if (!token) throw new ApiError(401, "Unauthorized Request");
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // console.log(decodedToken);
    const user = await User.findById(decodedToken?._id).select(
      "-password -resume -address -experience -bio -education -savedJobs -appliedJobs -givenRatingsAndReviews -refreshToken"
    );
    if (!user) throw new ApiError(401, "Unauthorized Request");
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid Access Token");
  }
});

export const verifyCompanyJWT = asyncHandler(async (req, res) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization").replace("Bearer", "");
    if (!token) throw new ApiError(401, "Unauthorized Request");
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // console.log(decodedToken);
    const company = await Company.findById(decodedToken?._id).select(
      "-password -verificationDocuments -refreshToken"
    );
    if (!company) throw new ApiError(401, "Unauthorized Request");
    req.company = company;
    next();
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid Access Token");
  }
});

export const verifyAdminJWT = asyncHandler(async (req, res) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization").replace("Bearer", "");
    if (!token) throw new ApiError(401, "Unauthorized Request");
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // console.log(decodedToken);
    const admin = await Admin.findById(decodedToken?._id).select(
      "-adminPassword -refreshToken"
    );
    if (!admin) throw new ApiError(401, "Unauthorized Request");
    req.admin = admin;
    next();
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid Access Token");
  }
});
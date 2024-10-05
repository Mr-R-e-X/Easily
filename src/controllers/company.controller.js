// import from external package
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
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

// const generateAccessAndRefreshToken = async (companyId) => {
//   try {
//     const company = await Company.findById(companyId);
//     const accessToken = await company.generateAccessToken();
//     const refreshToken = await company.generateRefreshToken();
//     console.log("access token: " + accessToken);
//     console.log("refresh token: " + refreshToken);
//     company.refreshToken = refreshToken;
//     await company.save({ validateBeforeSave: false });
//     return { accessToken, refreshToken };
//   } catch (error) {
//     throw new ApiError(
//       500,
//       "Something went wrong while generating access token and refresh token"
//     );
//   }
// };

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
      new ApiResponse(
        201,
        company,
        accessToken,
        "Company account created successfully"
      )
    );
});

const loginAsCompany = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const company = await Company.findOne({ email });
  if (!company) throw new ApiError(400, "Company not found");
  const matchPassword = company.isPasswordValid(password);
  if (!matchPassword) throw new ApiError(400, "Invalid password");
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    Company,
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
        accessToken,
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
    let localLogoPath = req.files.logo[0].path;
    if (company.logo !== "") await destroyFromCloudinary(company.logo);
    logoCloudinaryPath = await uploadDataInCloudinary(localLogoPath);
  }
  if (
    req.files &&
    Array.isArray(req.files.companyImages) &&
    req.files.companyImages.length > 0
  ) {
    companyImagesCloudinaryPaths = await Promise.all(
      req.files.companyImages.map(async (images) => {
        let path = await uploadDataInCloudinary(images.path);
        return path.url;
      })
    );
    let len = companyImagesCloudinaryPaths.length;
    const itemToDelete = company.companyImages.splice(
      company.companyImages.length - len,
      len
    );
    await Promise.all(
      itemToDelete.map(async (image) => await destroyFromCloudinary(image))
    );
    await company.save();
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

const uploadCompanyVerificationDocuments = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.company?._id);

  if (!company) {
    return res.status(404).json(new ApiError(404, "Company not found"));
  }

  if (req.files && req.files.length > 0) {
    const documents = await Promise.all(
      req.files.map(async (file, idx) => {
        const documentType = req.body.documentType[idx];
        const uploadResponse = await uploadDataInCloudinary(file.path);

        return {
          documentType,
          url: uploadResponse.url,
        };
      })
    );

    company.verificationDocuments = documents;
    await company.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(
        new ApiResponse(
          201,
          company.verificationDocuments,
          "Documents uploaded successfully"
        )
      );
  }
});

const updateCompanyVerificationStatus = asyncHandler(async (req, res) => {});

const sendCompanyVerificationMail = asyncHandler(async (req, res) => {
  const { email } = req.company;
  const company = await Company.findById(req.company?._id);
  if (!company) throw new ApiError(400, "Company not found");
  const otp = generateRandomOtp();
  if (company.isEmailVerified)
    throw new ApiError(401, "Email already verified");
  const checkPrevious = await CompanyOTP.findOne({ companyId: company._id });
  const mail = await sendMailFunction(
    email,
    "Email Verification",
    `<h1>Hi,</h1><h1>Your OTP is <strong>${otp}</strong></h1>`
  );
  console.log("Mail: ", mail);
  if (!checkPrevious) {
    await CompanyOTP.create({ companyId: company._id, otp });
    return res
      .status(200)
      .json(new ApiResponse(201, otp, "OTP send seccessfully"));
  }
  console.log("Mail: ", mail);
  checkPrevious.otp = otp;
  checkPrevious.createdAt = Date.now();
  return res
    .status(200)
    .json(new ApiResponse(201, otp, "Otp resended successfully"));
});

const verifyCompanyEmail = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp) throw new ApiError(400, "OTP is required");
  const company = await CompanyOTP.findOne({ companyId: req.company?._id });
  if (!company) throw new ApiError(400, "Unauthorized");
  const isCorrectOtp = company.compareOtp(otp);
  if (!isCorrectOtp) throw new ApiError(400, "Wrong OTP");
  const updatedCompany = await Company.findByIdAndUpdate(
    { _id: company.companyId },
    { $set: { isEmailVerified: true } },
    { new: true }
  ).select("-password -verificationDocuments -refreshToken");
  await CompanyOTP.findByIdAndDelete(company._id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedCompany, "Email is verified successfully")
    );
});

const createAdminAccess = asyncHandler(async (req, res) => {
  const { adminName, adminId, adminEmail, depertment, password } = req.body;
  console.table([adminName, adminId, adminEmail, depertment, password]);
  if (!adminName || !adminId || !adminEmail || !depertment || !password)
    throw new ApiError(400, "All feilds are required");
  const company = await Company.findById(req.company?._id);
  if (!company) throw new ApiError(400, "Unauthorized");
  const checkAvailableAdmin = await Admin.findOne({ adminId, adminEmail });
  // console.log(checkAvailableAdmin);
  if (checkAvailableAdmin) throw new ApiError(401, "Already registered");
  const newAdmin = await Admin.create({
    company: company._id,
    adminName,
    adminId,
    adminEmail,
    adminPassword: password,
    depertment,
  });

  company.adminDept.push(newAdmin._id);
  await company.save();
  const newAdminDetails = await Admin.findById(newAdmin._id).select(
    "-adminPassword"
  );

  return res
    .status(200)
    .json(new ApiResponse(201, newAdminDetails, "New Admin created"));
});

const revokeAdminAccess = asyncHandler(async (req, res) => {
  const { adminEmail, adminId } = req.body;
  if (!adminEmail && !adminId)
    throw new ApiError(400, "Admin Email and ID is required");
  const company = await Company.findById(req.company?._id);
  console.log(adminEmail, adminId);
  if (!company) throw new ApiError(400, "Unauthorized");
  const checkAdmin = await Admin.findOne({
    company: company._id,
    adminEmail,
    adminId,
  });
  console.log(checkAdmin);
  if (!checkAdmin) throw new ApiError(401, "Admin not found");
  console.log(company.adminDept[0]);
  const adminIndex = company.adminDept.findIndex((admin) =>
    admin.equals(checkAdmin._id)
  );
  if (adminIndex === -1) throw new ApiError(401, "Admin not found");
  const removedAdmin = company.adminDept[adminIndex];
  company.adminDept.splice(adminIndex, 1);
  await company.save();
  await Admin.deleteOne(removedAdmin._id);
  return res
    .status(200)
    .json(new ApiResponse(204, {}, "Admin Removed Successfully"));
});

const postNewJob = asyncHandler(async (req, res) => {
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

  const company = await Company.findById({
    _id: req.company?._id,
  });
  const newJob = await Job.create({
    title,
    description,
    location,
    companyName: company.name,
    companyLogo: company.logo || "",
    skills,
    numberOfVacancies,
    requirements,
    responsibilities,
    employmentType,
    salaryRange: salaryRange || "Not Disclosed",
    companyRef: req.company?._id,
  });

  await Company.findByIdAndUpdate(
    { _id: req.company?._id },
    { $push: { jobsPosted: newJob._id } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(201, newJob, "Job created successfully"));
});

const updateJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) throw new ApiError(400, "Job ID is required");
  const jobDtls = await Job.findById(jobId);
  if (!jobDtls) throw new ApiError(400, "Job not found");
  if (!jobDtls.companyRef.equals(req.company?._id))
    throw new ApiError(400, "Unauthorized");
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
    status,
  } = req.body;

  const updates = {};
  if (title) updates.title = title;
  if (description) updates.description = description;
  if (location) updates.location = location;
  if (employmentType) updates.employmentType = employmentType;
  if (skills && skills.length > 0) {
    let newSkills = jobDtls.skills.filter((skill) => {
      if (!skills.includes(skill)) return skill;
    });
    skills = [...skills, ...newSkills];
    updates.skills = skills;
  }
  if (numberOfVacancies) updates.numberOfVacancies = numberOfVacancies;
  if (requirements) updates.requirements = requirements;
  if (responsibilities) updates.responsibilities = responsibilities;
  if (salaryRange) updates.salaryRange = salaryRange;
  if (status) updates.status = status;
  if (Object.keys(updates).length == 0) {
    throw new ApiError(400, "No updates provided");
  }
  const updatedJob = await Job.findByIdAndUpdate(jobId, updates, { new: true });
  return res
    .status(200)
    .json(new ApiResponse(200, updatedJob, "Job updated successfully"));
});

const deleteJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) throw new ApiError(400, "Job ID is required");
  const jobDtls = await Job.findById(jobId);
  if (!jobDtls) throw new ApiError(400, "Job not found");
  if (!jobDtls.companyRef.equals(req.company?._id))
    throw new ApiError(400, "Unauthorized");
  await Job.findByIdAndDelete(jobId);
  await Company.findByIdAndUpdate(
    { _id: req.company?._id },
    { $pull: { jobsPosted: jobId } },
    { new: true }
  );
  return res.status(200).json(new ApiResponse(201, {}, "Deleted Successfully"));
});

const getApplicantsDetails = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) throw new ApiError(400, "Job ID is required");
  const jobDtls = await Job.findById(jobId);
  if (!jobDtls) throw new ApiError(400, "Job not found");
  if (jobDtls.companyRef !== req.company?._id)
    throw new ApiError(400, "Unauthorized");
  const getApplicats = await Application.aggregate([
    {
      $match: {
        jobId: jobDtls._id,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "candidateId",
        foreignField: "_id",
        as: "candidate",
      },
    },
    {
      $group: {
        candidateName: { $first: "$candidate.name" },
        email: { $first: "$candidate.email" },
        resume: { $first: "$resumeLink" },
        currentlyWorkingAt: { $first: "$candidate.currentlyWorkingAt" },
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, getApplicats, "Total application list"));
});

const logoutAsCompany = asyncHandler(async (req, res) => {
  await Company.findByIdAndUpdate(
    { _id: req.company._id },
    { $set: { refreshToken: null } }
  );
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

const refreshCompanyAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(400, "Unauthorized");
  try {
    const decodeRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const company = await Company.findById(decodeRefreshToken?._id);
    if (!company) throw new ApiError(401, "Invalid Refresh Token");
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      Company,
      company._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, COOKIE_OPTIONS)
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .json(new ApiResponse(201, { accessToken, refreshToken }));
  } catch (error) {
    throw new ApiError(404, error?.message || "Invalid Refresh Token");
  }
});

export {
  registerCompany,
  loginAsCompany,
  updateCompanyDetails,
  uploadCompanyVerificationDocuments,
  updateCompanyVerificationStatus,
  sendCompanyVerificationMail,
  verifyCompanyEmail,
  createAdminAccess,
  revokeAdminAccess,
  postNewJob,
  getApplicantsDetails,
  deleteJob,
  logoutAsCompany,
  refreshCompanyAccessToken,
  updateJob,
};

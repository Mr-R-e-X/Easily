import mongoose from "mongoose";
import { Job } from "../models/jobs.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { Application } from "../models/application.model.js";
import { User } from "../models/user.model.js";

const { ObjectId } = mongoose.Types;

const getAllJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ status: "open" });
  return res
    .status(200)
    .json(
      new ApiResponse(200, { jobs }, "All active jobs fecthed successfully")
    );
});

const getSingleJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await Job.findOne({
    $and: [{ _id: new ObjectId(jobId) }, { status: "open" }],
  });
  if (!job) {
    return res.status(404).json(new ApiResponse(404, null, "Job not found"));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { job }, "Job data feched successfully"));
});

const applyJob = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { jobId } = req.params;
  if (!jobId) throw new ApiError(404, "Job Id is required");
  const job = await Job.findById(jobId);
  if (!job) throw new ApiError(404, "Job not found");
  const user = await User.findById(_id);
  if (user.resume == "") {
    throw new ApiError(400, "Please upload your resume first");
  }
  await Application.create({
    jobId: job._id,
    candidateId: new ObjectId(_id),
    resumeLink: user.resume,
  });
  job.totalApplicantCount += 1;
  await job.save();
  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "You have successfully applied for the job")
    );
});

export { getAllJobs, getSingleJob, applyJob };

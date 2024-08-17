import mongoose, { Schema } from "mongoose";
import { Company } from "./company.model.js";

const jobSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    companyRef: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    comapnyName: {
      type: String,
    },
    companyLogo: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship", "Temporary"],
      required: true,
    },
    skills: [
      {
        type: String,
        required: true,
      },
    ],
    numberOfVacancies: {
      type: Number,
    },
    requirements: {
      type: String,
      required: true,
    },
    responsibilities: {
      type: String,
      required: true,
    },
    salaryRange: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "open",
      enum: ["open", "closed"],
    },
  },
  { timestamps: true }
);

export const Job = mongoose.model("Job", jobSchema);

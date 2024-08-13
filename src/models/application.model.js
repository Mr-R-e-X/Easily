import mongoose, { Schema } from "mongoose";

const applicationSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resumeLink: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Application = mongoose.model("Application", applicationSchema);

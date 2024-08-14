import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const companyOtpSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

companyOtpSchema.pre("save", async function (next) {
  if (!this.isModified("otp")) return next();
  this.otp = await bcrypt.hash(this.otp, 12);
});

companyOtpSchema.methods.compareOtp = async function (otp) {
  return await bcrypt.compare(otp, this.otp);
};

export const CompanyOTP = mongoose.model("CompanyOTP", companyOtpSchema);

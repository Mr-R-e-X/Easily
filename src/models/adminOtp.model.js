import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const adminOtpSchema = new Schema({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: "Admin",
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

adminOtpSchema.pre("save", async function (next) {
  if (!this.isModified("otp")) return next();
  this.otp = await bcrypt.hash(this.otp, 12);
});

adminOtpSchema.methods.compareOtp = async function (otp) {
  return await bcrypt.compare(otp, this.otp);
};

export const AdminOTP = mongoose.model("AdminOTP", adminOtpSchema);

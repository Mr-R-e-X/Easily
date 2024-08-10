import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const userOtpSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
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

userOtpSchema.pre("save", async function (next) {
  if (!this.isModified("otp")) return next();
  this.otp = await bcrypt.hash(this.otp, 12);
});

userOtpSchema.methods.compareOtp = async function (otp) {
  return await bcrypt.compare(otp, this.otp);
};

export const UserOTP = mongoose.model("UserOTP", userOtpSchema);

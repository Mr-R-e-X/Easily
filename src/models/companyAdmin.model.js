import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const adminSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    adminId: {
      type: String,
      required: true,
      unique: true,
    },
    adminEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    idEmailVerified: {
      type: Boolean,
      default: false,
    },
    adminPassword: {
      type: String,
      required: true,
    },
    depertment: {
      type: String,
      required: true,
    },
    postedJobs: [{ type: Schema.Types.ObjectId, ref: "Job" }],
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("adminPassword")) return next();
  this.adminPassword = await bcrypt.hash(this.adminPassword, 12);
});

adminSchema.methods.isPasswordValid = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.adminPassword);
};

adminSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      company: this.company,
      adminName: this.adminName,
      adminId: this.adminId,
      adminEmail: this.adminEmail,
      depertment: this.depertment,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

adminSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const Admin = mongoose.model("Admin", adminSchema);

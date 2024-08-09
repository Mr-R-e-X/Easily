import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const experienceSchema = new Schema({
  companyName: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
    required: true,
  },
  dateOfJoining: {
    type: String,
    required: true,
  },
  dateOfEnding: {
    type: String,
    required: true,
  },
});
const educationSchema = new Schema({
  degree: {
    type: String,
    required: true,
  },
  institution: {
    type: String,
    required: true,
  },
  yearOfPasing: {
    type: Number,
    required: true,
  },
});
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    avatar: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    resume: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    experience: {
      type: [experienceSchema],
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    education: {
      type: [educationSchema],
      default: "",
    },
    savedJobs: [
      {
        type: Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
    appliedJobs: [
      {
        type: Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
    givenRatingsAndReviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Company",
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        review: {
          type: String,
          required: true,
        },
      },
    ],
    refreshToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.isPasswordValid = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      coverImage: this.coverImage,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = async function () {
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

export const User = mongoose.model("User", userSchema);

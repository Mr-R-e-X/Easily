import mongoose, { Schema } from "mongoose";

const ratingsAndReviewsSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
  },
});

const companySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      immutable: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    website: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
    },
    companyImages: [
      {
        type: String,
        default: "",
      },
    ],
    estd: {
      type: Date,
    },
    description: {
      type: String,
      required: true,
    },
    socialLinks: [
      {
        socialMediaName: String,
        link: String,
      },
    ],
    ratingsAndReviews: [ratingsAndReviewsSchema],
    verificationDocuments: [
      {
        type: String,
      },
    ],
    verificationStatus: {
      type: String,
      enum: ["Verified", "Pending", "Denied"],
      default: "Pending",
    },
    jobsPosted: [{ type: Schema.Types.ObjectId, ref: "Job" }],
    refreshToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

companySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
});

companySchema.methods.isPasswordValid = async function (password) {
  return await bcrypt.compare(password, this.password);
};

companySchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name,
      logo: this.logo,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

companySchema.methods.generateRefreshToken = async function () {
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

export const Company = mongoose.model("Company", companySchema);

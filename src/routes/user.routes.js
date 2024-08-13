import { Router } from "express";
import upload from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  login,
  sendVerificationEmail,
  verifyEmailOTP,
  updateUserDetails,
  logout,
  refreshAccessToken,
  updateUserPassword,
  giveCompanyRatingAndReview,
} from "../controllers/user.controllers.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(login);
router.route("/logout").post(verifyJWT, logout);
router.route("/reset-access-token").post(refreshAccessToken);

//Protedcted Route
router.route("/send-verification-mail").post(verifyJWT, sendVerificationEmail);
router.route("/verify-email").patch(verifyJWT, verifyEmailOTP);
router.route("/update-profile-details").patch(
  verifyJWT,
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
    {
      name: "resume",
      maxCount: 1,
    },
  ]),
  updateUserDetails
);
router.route("/change-password").patch(verifyJWT, updateUserPassword);
router.route("/add-review").patch(verifyJWT, giveCompanyRatingAndReview);


export default router;

import { Router } from "express";
import upload from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  login,
  sendVerificationEmail,
  verifyEmailOTP,
  forgotPassword,
  updatePassword,
  updateUserDetails,
  logout,
  giveCompanyRating,
  refreshAccessToken,
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

//Protedcted Route
router.route("/send-verification-mail").post(verifyJWT, sendVerificationEmail);
router.route("/verify-email").post(verifyJWT, verifyEmailOTP);
export default router;

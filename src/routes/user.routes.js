import { Router } from "express";
import upload from "../middlewares/multer.middleware.js";
import { verifyUserJWT } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  login,
  sendVerificationEmail,
  verifyEmailOTP,
  updateUserDetails,
  logout,
  updateUserPassword,
  giveCompanyRatingAndReview,
  applyForJob,
  savedJobs,
  removeJobFromSavedJob,
  refreshUserAccessToken,
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
router.route("/logout").post(logout);
router.route("/reset-access-token").post(refreshUserAccessToken);

//Protedcted Route
router
  .route("/send-verification-mail")
  .post(verifyUserJWT, sendVerificationEmail);
router.route("/verify-email").patch(verifyUserJWT, verifyEmailOTP);
router.route("/update-profile-details").patch(
  verifyUserJWT,
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
router.route("/change-password").patch(verifyUserJWT, updateUserPassword);
router.route("/add-review").patch(verifyUserJWT, giveCompanyRatingAndReview);
router.route("/apply").post(verifyUserJWT, applyForJob);
router.route("/save-job").post(verifyUserJWT, savedJobs);
router
  .route("/remove-from-saved-list")
  .post(verifyUserJWT, removeJobFromSavedJob);


export default router;

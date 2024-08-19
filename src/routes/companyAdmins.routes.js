import { Router } from "express";
import { verifyAdminJWT } from "../middlewares/auth.middleware.js";
import {
  getApplicantsDetails,
  loginAsAdmin,
  logoutAdmin,
  postJobAsAdmin,
  refreshAdminAccessToken,
  sendVerificationAdminEmail,
  updateJobAsAdmin,
  verifyAdminEmail,
} from "../controllers/admin.contoller.js";

const router = Router();

router.route("/login").post(loginAsAdmin);
router.route("/logout").patch(verifyAdminJWT, logoutAdmin);
router.route("/refresh-access-token").post(refreshAdminAccessToken);
router
  .route("/send-email-verification")
  .post(verifyAdminJWT, sendVerificationAdminEmail);
router.route("/verify-otp").patch(verifyAdminJWT, verifyAdminEmail);
router.route("/post-new-job").patch(verifyAdminJWT, postJobAsAdmin);
router.route("/update-job/:jobId").patch(verifyAdminJWT, updateJobAsAdmin);
router
  .route("/get-applications/:jobId")
  .post(verifyAdminJWT, getApplicantsDetails);

export default router;

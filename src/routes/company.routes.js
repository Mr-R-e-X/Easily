import { Router } from "express";
import { verifyCompanyJWT } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";
import {
  createAdminAccess,
  getApplicantsDetails,
  loginAsCompany,
  postNewJob,
  refreshCompanyAccessToken,
  registerCompany,
  revokeAdminAccess,
  sendCompanyVerificationMail,
  updateCompanyDetails,
  uploadCompanyVerificationDocuments,
  verifyCompanyEmail,
  deleteJob,
  logoutAsCompany,
  updateJob,
} from "../controllers/company.controller.js";
import companyAdminRouter from "./companyAdmins.routes.js";

const router = Router();

router.route("/register").post(registerCompany);
router.route("/login").post(loginAsCompany);
router.route("/refresh-access-token").post(refreshCompanyAccessToken);
// protected routes
router
  .route("/send-verification-email")
  .post(verifyCompanyJWT, sendCompanyVerificationMail);
router
  .route("/check-verification-otp")
  .put(verifyCompanyJWT, verifyCompanyEmail);

router
  .route("/add-verification-documnts")
  .patch(
    verifyCompanyJWT,
    upload.array("documents", 4),
    uploadCompanyVerificationDocuments
  );
router.route("/update-company-details").put(
  verifyCompanyJWT,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "companyImages", maxCount: 5 },
  ]),
  updateCompanyDetails
);
router.route("/create-admin").patch(verifyCompanyJWT, createAdminAccess);
router.route("/remove-admin").patch(verifyCompanyJWT, revokeAdminAccess);
router.route("/post-job").patch(verifyCompanyJWT, postNewJob);
router.route("/get-applications").patch(verifyCompanyJWT, getApplicantsDetails);
router.route("/delete-job/:jobId").delete(verifyCompanyJWT, deleteJob);
router.route("/update-job/:jobId").patch(verifyCompanyJWT, updateJob);
router.route("/logout").patch(verifyCompanyJWT, logoutAsCompany);
router.use("/admin", companyAdminRouter);

export default router;

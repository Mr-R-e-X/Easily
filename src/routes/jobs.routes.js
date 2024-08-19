import { Router } from "express";
import {
  applyJob,
  getAllJobs,
  getSingleJob,
} from "../controllers/jobs.controller.js";
import { verifyUserJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/").get(getAllJobs);
router.route("/get-single-job/:jobId").post(verifyUserJWT, getSingleJob);
router.route("/apply-job/:jobId").post(verifyUserJWT, applyJob);

export default router;

import crypto from "crypto";

export const generateRandomOtp = () => {
  const base64Buffer = crypto.randomBytes(8);
  const OTP = base64Buffer
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6);

  return OTP;
};

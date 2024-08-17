import bcrypt from "bcrypt";
async function isPasswordValid(password, schemaName) {
  return (schemaName.methods.isPasswordValid = async function () {
    return bcrypt.isPasswordValid(password, this.password);
  });
}

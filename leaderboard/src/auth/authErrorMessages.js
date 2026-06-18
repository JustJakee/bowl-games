export const mapAuthErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  const name = error?.name || "";
  const message = error?.message || "";

  if (
    name === "NotAuthorizedException" ||
    message.toLowerCase().includes("incorrect username or password")
  ) {
    return "Incorrect email or password.";
  }

  if (name === "UserNotFoundException") {
    return "Incorrect email or password.";
  }

  if (name === "UserNotConfirmedException") {
    return "Your account needs additional verification. Contact the pool administrator.";
  }

  if (name === "PasswordResetRequiredException") {
    return "Your password must be reset before you can sign in.";
  }

  if (name === "LimitExceededException" || message.toLowerCase().includes("attempt limit exceeded")) {
    return "Your account is temporarily locked. Try again later.";
  }

  if (name === "CodeMismatchException") {
    return "The confirmation code is invalid or expired.";
  }

  if (name === "ExpiredCodeException") {
    return "The confirmation code is invalid or expired.";
  }

  if (name === "InvalidPasswordException") {
    return "Your new password does not meet the account requirements.";
  }

  if (name === "InvalidParameterException" && message.toLowerCase().includes("password")) {
    return "Your new password does not meet the account requirements.";
  }

  if (name === "CodeDeliveryFailureException") {
    return "A confirmation code could not be sent. Contact the pool administrator.";
  }

  return fallback;
};

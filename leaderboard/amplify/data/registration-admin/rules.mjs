export const isVerifiedRegistration = (user) => {
  const attributes = Object.fromEntries(
    (user?.Attributes || user?.UserAttributes || []).map(({ Name, Value }) => [
      Name,
      Value,
    ]),
  );
  return (
    user?.UserStatus === "CONFIRMED" &&
    attributes.email_verified === "true" &&
    Boolean(attributes.email)
  );
};

export const isAwaitingApproval = (user, groups = []) =>
  isVerifiedRegistration(user) &&
  !groups.some((group) => ["player", "admin"].includes(group));

export const assertAdminIdentity = (identity) => {
  const groups = identity?.groups ?? identity?.claims?.["cognito:groups"] ?? [];
  if (!Array.isArray(groups) || !groups.includes("admin")) {
    throw new Error("Administrator authorization is required.");
  }
};

export const approveVerifiedPlayer = async ({
  username,
  getUser,
  getGroups,
  addPlayer,
}) => {
  if (
    typeof username !== "string" ||
    !username.trim() ||
    username.length > 128
  ) {
    throw new Error("A valid registration identifier is required.");
  }
  const user = await getUser(username);
  if (!isVerifiedRegistration(user))
    throw new Error("The account must verify its email before approval.");
  const groups = await getGroups(username);
  if (groups.includes("admin"))
    throw new Error("Administrator accounts cannot be approved as players.");
  if (!groups.includes("player")) await addPlayer(username);
  return true;
};

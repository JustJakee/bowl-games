import {
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { env } from "$amplify/env/registration-admin";
import {
  approveVerifiedPlayer,
  assertAdminIdentity,
  isAwaitingApproval,
  isVerifiedRegistration,
} from "./rules.mjs";

const client = new CognitoIdentityProviderClient();
const userPoolId = env.AMPLIFY_AUTH_USERPOOL_ID;

const groupsFor = async (username) => {
  const result = await client.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    }),
  );
  return (result.Groups || []).map((group) => group.GroupName).filter(Boolean);
};

const listPendingRegistrations = async () => {
  const pending = [];
  let paginationToken;
  do {
    const result = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Limit: 60,
        PaginationToken: paginationToken,
      }),
    );
    for (const user of result.Users || []) {
      if (!isVerifiedRegistration(user) || !user.Username) continue;
      const groups = await groupsFor(user.Username);
      if (!isAwaitingApproval(user, groups)) continue;
      const email = user.Attributes.find(({ Name }) => Name === "email")?.Value;
      pending.push({
        username: user.Username,
        email,
        createdAt: user.UserCreateDate?.toISOString() || null,
      });
    }
    paginationToken = result.PaginationToken;
  } while (paginationToken);
  return pending.sort(
    (a, b) => a.createdAt?.localeCompare(b.createdAt || "") || 0,
  );
};

const approveRegistration = (username) =>
  approveVerifiedPlayer({
    username,
    getUser: (name) =>
      client.send(
        new AdminGetUserCommand({ UserPoolId: userPoolId, Username: name }),
      ),
    getGroups: groupsFor,
    addPlayer: (name) =>
      client.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: userPoolId,
          Username: name,
          GroupName: "player",
        }),
      ),
  });

export const handler = async (event) => {
  assertAdminIdentity(event.identity);
  // Amplify's @function resolver flattens ctx.info into typeName/fieldName.
  if (event.fieldName === "listPendingRegistrations")
    return listPendingRegistrations();
  if (event.fieldName === "approveRegistration")
    return approveRegistration(event.arguments?.username);
  throw new Error("Unsupported registration operation.");
};

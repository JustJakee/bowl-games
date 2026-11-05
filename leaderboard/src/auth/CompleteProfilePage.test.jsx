import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import CompleteProfilePage, {
  FavoriteTeamSetupSection,
} from "./CompleteProfilePage.jsx";

test("profile completion communicates permanence and optional team selection", () => {
  const markup = renderToStaticMarkup(
    <CompleteProfilePage
      email="fan@example.com"
      onSaveProfile={async () => {}}
      onSignOut={() => {}}
    />,
  );

  assert.match(markup, /Complete Your Player Profile/);
  assert.doesNotMatch(markup, /Choose how you&#x27;ll appear/);
  assert.match(markup, /Your username is permanent/);
  assert.match(markup, /You won&#x27;t be able to change it after saving\./);
  assert.match(markup, /Public Username/);
  assert.match(markup, /Username requirements/);
  assert.match(markup, /No spaces/);
  assert.match(markup, /3–20 characters/);
  assert.match(markup, /Favorite Team/);
  assert.match(markup, /Optional/);
  assert.match(markup, /Choose Favorite Team/);
  assert.match(markup, /Save Profile/);
});

test("selected favorite team displays its full name, logo, and change action", () => {
  const markup = renderToStaticMarkup(
    <FavoriteTeamSetupSection
      team={{
        id: "333",
        displayName: "Alabama Crimson Tide",
        logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
      }}
      onChoose={() => {}}
    />,
  );

  assert.match(markup, /Alabama Crimson Tide/);
  assert.match(markup, /Alabama Crimson Tide logo/);
  assert.match(markup, /Change Team/);
  assert.doesNotMatch(
    markup,
    /change your favorite team later in Account Settings/,
  );
  assert.doesNotMatch(markup, /No team selected/);
});

test("profile form reuses the team dialog and guards invalid or duplicate saves", () => {
  const source = readFileSync(
    new URL("./CompleteProfilePage.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /<FavoriteTeamDialog/);
  assert.match(source, /useFbsTeams\(\)/);
  assert.match(source, /if \(usernameError \|\| savingRef\.current\) return/);
  assert.match(source, /disabled=\{Boolean\(usernameError\) \|\| saving\}/);
  assert.match(source, /setFavoriteTeamId\(String\(teamId\)\)/);
  assert.match(source, /direction=\{\{ xs: "column", sm: "row" \}\}/);
  assert.match(source, /alignSelf: \{ xs: "stretch", sm: "flex-start" \}/);
  assert.doesNotMatch(source, /<Chip|ShieldOutlinedIcon/);
});

test("profile completion leaves approval gating ahead of profile creation", () => {
  const source = readFileSync(
    new URL("../components/AuthShell.jsx", import.meta.url),
    "utf8",
  );
  const approvalGate = source.indexOf('role !== "player" && role !== "admin"');
  const profileProvider = source.indexOf("<UserProfileProvider>");

  assert.ok(approvalGate >= 0);
  assert.ok(profileProvider > approvalGate);
  assert.match(source, /isUsernameTaken\(usernameKey\)/);
  assert.match(source, /adoptCreatedProfile\(result\.profile\)/);
  assert.doesNotMatch(source, /addUserToGroup|approveRegistration/);
});

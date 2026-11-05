import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AccountSettingsView,
  resolveAccountPaymentState,
} from "./MorePage.jsx";
import { applySavedFavoriteTeamToState } from "../auth/UserProfileContext.jsx";

const renderAccount = (paymentState) =>
  renderToStaticMarkup(
    <AccountSettingsView
      username="Bowl Fan"
      email="bowl.fan.with.a.long.address@example.com"
      paymentState={paymentState}
      onChooseFavoriteTeam={() => {}}
      onChangePassword={() => {}}
    />,
  );

test("account settings renders read-only profile and placeholder cards", () => {
  const markup = renderAccount("paid");

  assert.match(markup, /Account Settings/);
  assert.match(markup, /Manage your player account/);
  assert.match(markup, /Profile Information/);
  assert.match(markup, /Bowl Fan/);
  assert.match(markup, /bowl\.fan\.with\.a\.long\.address@example\.com/);
  assert.match(markup, /Favorite Team/);
  assert.match(markup, /Security/);
  assert.doesNotMatch(markup, /Coming Soon/);
  assert.match(markup, /Choose your favorite college football team\./);
  assert.match(markup, /Select Favorite Team/);
  assert.match(markup, /Change Password/);
  assert.match(markup, /Manage your account password\./);
  assert.doesNotMatch(markup, /Choose a unique password|>Password<\/span>/);
  assert.doesNotMatch(markup, /Role:|player \(player\)|<form/i);
});

test("account settings displays paid and unpaid payment treatments", () => {
  const paidMarkup = renderAccount("paid");
  const unpaidMarkup = renderAccount("unpaid");

  assert.match(paidMarkup, /Paid/);
  assert.match(paidMarkup, /Payment Confirmed/);
  assert.match(paidMarkup, /Your picks have been marked as paid\./);
  assert.match(unpaidMarkup, /Unpaid/);
  assert.match(unpaidMarkup, /Payment Pending/);
  assert.match(
    unpaidMarkup,
    /Your picks are currently unpaid, please pay Jake or Bob Koons/,
  );
});

test("loading and unavailable payment data never render as unpaid", () => {
  const loadingMarkup = renderAccount("loading");
  const unavailableMarkup = renderAccount("unavailable");

  assert.match(loadingMarkup, /Loading/);
  assert.match(loadingMarkup, /Payment information is loading\./);
  assert.doesNotMatch(loadingMarkup, /Unpaid|Payment Pending/);
  assert.match(unavailableMarkup, /Unavailable/);
  assert.doesNotMatch(unavailableMarkup, /Unpaid|Payment Pending/);
});

test("payment state resolves only after the scoped entry is ready", () => {
  assert.equal(
    resolveAccountPaymentState({
      currentEntry: { paymentStatus: "unpaid" },
      entriesLoading: true,
      entriesReady: false,
    }),
    "loading",
  );
  assert.equal(
    resolveAccountPaymentState({
      currentEntry: null,
      entriesLoading: false,
      entriesReady: true,
    }),
    "unavailable",
  );
  assert.equal(
    resolveAccountPaymentState({
      currentEntry: { paymentStatus: "paid" },
      entriesLoading: false,
      entriesReady: true,
    }),
    "paid",
  );
  assert.equal(
    resolveAccountPaymentState({
      currentEntry: { paymentStatus: "unpaid" },
      entriesLoading: false,
      entriesReady: true,
    }),
    "unpaid",
  );
  assert.equal(
    resolveAccountPaymentState({
      currentEntry: { paymentStatus: null },
      entriesLoading: false,
      entriesReady: true,
    }),
    "unavailable",
  );
});

test("account layout is responsive and exposes no payment editing controls", () => {
  const source = readFileSync(
    new URL("./MorePage.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /maxWidth: 1080/);
  assert.match(source, /xs: "minmax\(0, 1fr\)"/);
  assert.match(source, /sm: "repeat\(2, minmax\(0, 1fr\)\)"/);
  assert.match(source, /lg: "repeat\(3, minmax\(0, 1fr\)\)"/);
  assert.match(source, /overflowWrap: "anywhere"/);
  assert.doesNotMatch(
    source,
    /updateAdminEntryPayment|TextField|Switch|Checkbox/,
  );
});

test("security action controls the change password dialog", () => {
  const source = readFileSync(
    new URL("./MorePage.jsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /onChangePassword=\{\(\) => setChangePasswordOpen\(true\)\}/,
  );
  assert.match(source, /<ChangePasswordDialog/);
  assert.match(source, /open=\{changePasswordOpen\}/);
  assert.match(source, /onClose=\{\(\) => setChangePasswordOpen\(false\)\}/);
  assert.doesNotMatch(
    source,
    /title="Security"[\s\S]*?badge=\{<Chip label="Coming Soon"/,
  );
});

test("saved favorite team appears in both account cards", () => {
  const markup = renderToStaticMarkup(
    <AccountSettingsView
      username="Bowl Fan"
      email="fan@example.com"
      paymentState="paid"
      favoriteTeamId="333"
      favoriteTeam={{
        id: "333",
        displayName: "Alabama Crimson Tide",
        abbreviation: "ALA",
        logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
      }}
      onChooseFavoriteTeam={() => {}}
      onChangePassword={() => {}}
    />,
  );

  assert.equal(markup.match(/Alabama Crimson Tide logo/g)?.length, 2);
  assert.match(markup, /Alabama Crimson Tide/);
  assert.match(markup, /Change Favorite Team/);
  assert.doesNotMatch(markup, /Select Favorite Team/);
});

test("a confirmed save updates both favorite-team surfaces without a reload", () => {
  const next = applySavedFavoriteTeamToState(
    {
      status: "ready",
      profile: {
        id: "profile-1",
        owner: "owner-1",
        favoriteTeamId: "12",
      },
      error: "",
    },
    "owner-1",
    { id: "profile-1", owner: "owner-1" },
    "333",
  );
  const markup = renderToStaticMarkup(
    <AccountSettingsView
      username="Bowl Fan"
      email="fan@example.com"
      paymentState="paid"
      favoriteTeamId={next.profile.favoriteTeamId}
      favoriteTeam={{
        id: "333",
        displayName: "Alabama Crimson Tide",
        abbreviation: "ALA",
        logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
      }}
      onChooseFavoriteTeam={() => {}}
      onChangePassword={() => {}}
    />,
  );

  assert.equal(markup.match(/Alabama Crimson Tide logo/g)?.length, 2);
  assert.match(markup, /Change Favorite Team/);
});

test("favorite team action opens the picker without changing other account logic", () => {
  const source = readFileSync(
    new URL("./MorePage.jsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /onChooseFavoriteTeam=\{\(\) => setFavoriteTeamOpen\(true\)\}/,
  );
  assert.match(source, /<FavoriteTeamDialog/);
  assert.match(source, /onSave=\{updateFavoriteTeam\}/);
  assert.match(source, /savedTeamId=\{favoriteTeamId\}/);
});

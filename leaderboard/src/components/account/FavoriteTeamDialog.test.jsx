import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import FavoriteTeamDialog, {
  filterFavoriteTeams,
} from "./FavoriteTeamDialog.jsx";
import TeamAvatar from "./TeamAvatar.jsx";

const teams = [
  {
    id: "333",
    displayName: "Alabama Crimson Tide",
    abbreviation: "ALA",
    location: "Alabama",
    name: "Crimson Tide",
    logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
  },
  {
    id: "12",
    displayName: "Arizona Wildcats",
    abbreviation: "ARIZ",
    location: "Arizona",
    name: "Wildcats",
    logo: "",
  },
];

test("favorite team search supports name and abbreviation", () => {
  assert.deepEqual(
    filterFavoriteTeams(teams, "crimson").map((team) => team.id),
    ["333"],
  );
  assert.deepEqual(
    filterFavoriteTeams(teams, "ARIZ").map((team) => team.id),
    ["12"],
  );
  assert.equal(filterFavoriteTeams(teams, "missing").length, 0);
});

test("team avatar renders a real logo or the requested fallback", () => {
  const logoMarkup = renderToStaticMarkup(<TeamAvatar team={teams[0]} />);
  const fallbackMarkup = renderToStaticMarkup(
    <TeamAvatar fallbackIcon={<AccountCircleOutlinedIcon />} />,
  );

  assert.match(logoMarkup, /Alabama Crimson Tide logo/);
  assert.match(logoMarkup, /teamlogos\/ncaa\/500\/333\.png/);
  assert.match(fallbackMarkup, /AccountCircleOutlinedIcon/);

  const avatarSource = readFileSync(
    new URL("./TeamAvatar.jsx", import.meta.url),
    "utf8",
  );
  assert.match(avatarSource, /onError=\{\(\) => setFailed\(true\)\}/);
});

test("picker includes loading, retry, empty, save, cancel, and duplicate guards", () => {
  const source = readFileSync(
    new URL("./FavoriteTeamDialog.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /loadingText="Loading FBS teams\.\.\."/);
  assert.match(source, /No FBS teams match your search\./);
  assert.match(source, />\s*Retry\s*</);
  assert.match(source, />\s*Cancel\s*</);
  assert.match(source, /"Save Team"/);
  assert.match(source, /if \(!selectedTeam \|\| savingRef\.current\) return/);
  assert.match(source, /await onSave\(selectedTeam\.id\)/);
  assert.match(
    source,
    /isOptionEqualToValue=\{\(option, value\) => option\.id === value\.id\}/,
  );
  assert.match(source, /fullScreen=\{fullScreen\}/);
});

test("cancel resets pending selection from the persisted team on reopen", () => {
  const source = readFileSync(
    new URL("./FavoriteTeamDialog.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /teams\.find\(\(team\) => team\.id === String\(savedTeamId/);
  assert.match(source, /if \(!open\) return/);
  assert.match(source, /onClose\(\)/);
});

void FavoriteTeamDialog;

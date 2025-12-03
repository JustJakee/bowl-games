import { useMemo, useState } from "react";
import { Button, TextField } from "@mui/material";
import { useScoreboard } from "../context/NCAAFDataContext";
import PickMatchupCard, {
  TIEBREAKER_BOWL_NAME,
} from "../constants/PickMatchupCard";
import "../styles/pick-form.css";
import { uploadPicks } from "../utils/uploadPicks";
// import mockGames from "../assets/mockBowls.json";

const PickForm = ({ playerPicks, onSubmitResult }) => {
  const { games: scoreboardGames, loading, error } = useScoreboard();
  const picksClosed = false; // toggle off when bowl season opens
  const [picks, setPicks] = useState({});
  const [entryName, setEntryName] = useState("");
  const [email, setEmail] = useState("");
  const [tieBreaker, setTieBreaker] = useState("");
  const [hasSubmitAttempt, setHasSubmitAttempt] = useState(false);
  const existingNames = playerPicks.map((pick) =>
    (pick?.name || "").trim().toLowerCase()
  );

  /*
  // forcing mock data here
  const loading = false;
  const error = null;
  const scoreboardGames = mockGames;
  */

  const games = useMemo(() => {
    const seen = {};
    return scoreboardGames.map((game) => {
      const normalizeTeam = (team) => {
        const accent = team?.color || team?.alternateColor || "";
        const accentColor =
          accent && accent.startsWith("#")
            ? accent
            : accent
            ? `#${accent}`
            : "";

        return {
          id: team?.id,
          code: team?.abbr,
          nickname: team?.displayName,
          record: team?.rank,
          logoUrl: team?.logo,
          color: accentColor,
        };
      };

      const bowlName = game?.bowl || "Bowl Game Not Found"; // TO DO REMOVE BEFORE BOWL SEASON
      const count = (seen[bowlName] || 0) + 1;
      seen[bowlName] = count;
      const selectionKey = count > 1 ? `${bowlName} (#${count})` : bowlName;

      return {
        id: game?.id,
        bowlName,
        selectionKey,
        kickoffText: game?.startTimeText || "",
        location: game?.location || "",
        network: game?.network || "",
        statusText: game?.statusText || "",
        isLive: game?.state === "in",
        awayTeam: normalizeTeam(game?.away),
        homeTeam: normalizeTeam(game?.home),
      };
    });
  }, [scoreboardGames]);

  const trimmedName = entryName.trim();
  const trimmedEmail = email.trim();
  const hasEntryName = trimmedName.length > 0;
  const hasEmail = trimmedEmail.length > 0;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailIsValid = hasEmail ? emailPattern.test(trimmedEmail) : false;
  const duplicateEntryName =
    trimmedName.length > 0 && existingNames.includes(trimmedName.toLowerCase());
  const nameError = hasSubmitAttempt && (!hasEntryName || duplicateEntryName);
  const emailError = hasSubmitAttempt && (!hasEmail || !emailIsValid);
  const tieBreakerRequired = games.some(
    (game) => game?.bowlName === TIEBREAKER_BOWL_NAME
  );
  const tieBreakerProvided = tieBreakerRequired ? tieBreaker !== "" : true;
  const allPicksMade =
    games.length > 0 &&
    games.every((game) => {
      const bowlKey =
        game?.selectionKey || game?.bowlName?.trim() || "No Bowl Game";
      return Boolean(picks[bowlKey]);
    });
  const formIsValid =
    hasEntryName &&
    hasEmail &&
    emailIsValid &&
    allPicksMade &&
    tieBreakerProvided &&
    !duplicateEntryName;

  const clearValidityMessage = (event) => {
    event.target.setCustomValidity("");
  };

  const setValidityMessage = (event, message) => {
    event.target.setCustomValidity(message);
  };

  const validatePickName = (event, name) => {
    setEntryName(name);
    clearValidityMessage(event);
  };

  const handleSelect = (_gameId, selectionKey, teamCode) => {
    const bowlKey = selectionKey?.trim() || "No Bowl Game";
    setPicks((prev) => ({
      ...prev,
      [bowlKey]: teamCode,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitAttempt(true);
    if (picksClosed) {
      onSubmitResult?.({
        message: "Bowl season coming soon. Picks will open once games are set.",
        severity: "info",
      });
      return;
    }
    if (duplicateEntryName) {
      onSubmitResult?.({
        message:
          "That entry name is already in use. Please choose another before submitting.",
        severity: "error",
      });
      return;
    }
    if (!formIsValid) {
      onSubmitResult?.({
        message:
          "Please complete every pick and required field before submitting.",
        severity: "error",
      });
      return;
    }

    const input = {
      name: trimmedName,
      email: trimmedEmail,
      picks: JSON.stringify(picks),
      tieBreaker: tieBreaker ? parseInt(tieBreaker, 10) : 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await uploadPicks(input);
      onSubmitResult?.({
        message: `Thanks ${input.name}, your picks were submitted!`,
        severity: "success",
      });
      return saved;
    } catch (err) {
      onSubmitResult?.({
        message: `Sorry ${input.name}, we were unable to submit your picks. Please try again.`,
        severity: "error",
      });
    }
  };

  if (loading) {
    return <div className="pick-form-container loading">Loading games...</div>;
  }

  if (error) {
    return (
      <div className="pick-form-container error" role="alert">
        {error}
      </div>
    );
  }

  return (
    <form className="pick-form-container" onSubmit={handleSubmit}>
      <div className="pick-form-header">
        <div className="pick-form-field">
          <TextField
            label="Add a Name to Your Picks"
            placeholder="Name your entry"
            value={entryName}
            onChange={(event) => validatePickName(event, event.target.value)}
            onInvalid={(event) =>
              setValidityMessage(event, "Please enter a name for your entry.")
            }
            onInput={clearValidityMessage}
            size="small"
            fullWidth
            required
            error={nameError}
          />
        </div>
        <div className="pick-form-field">
          <TextField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onInvalid={(event) => {
              if (!event.target.value) {
                setValidityMessage(event, "Email is required.");
              } else {
                setValidityMessage(
                  event,
                  "Please enter a valid email address (example@domain.com)."
                );
              }
            }}
            onInput={clearValidityMessage}
            size="small"
            type="email"
            fullWidth
            required
            error={emailError}
          />
        </div>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          className="pick-form-submit"
          size="medium"
        >
          Submit Picks
        </Button>
      </div>
      {games.length === 0 && (
        <div className="empty-state">No bowl matchups available right now.</div>
      )}
      {games.map((game) => {
        const bowlKey =
          game?.selectionKey || game?.bowlName?.trim() || "No Bowl Game";
        return (
          <PickMatchupCard
            key={game.id}
            {...game}
            selectionKey={bowlKey}
            selection={picks[bowlKey]}
            onSelect={handleSelect}
            setTieBreaker={setTieBreaker}
            tieBreaker={tieBreaker}
          />
        );
      })}
      {picksClosed && (
        <div
          className="pick-form-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="picks-closed-title"
        >
          <div className="pick-form-overlay__content">
            <p id="picks-closed-title">Bowl Season Coming Soon</p>
            <p className="pick-form-overlay__subtitle">
              Picks will open as soon as the matchups are finalized.
            </p>
            <p className="pick-form-overlay__subtitle">Check back soon!</p>
          </div>
        </div>
      )}
    </form>
  );
};

export default PickForm;

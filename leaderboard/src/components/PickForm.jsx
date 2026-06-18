import { useEffect, useMemo, useState } from "react";
import { Button, TextField } from "@mui/material";
import { useAppData } from "../app/AppDataContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import PickMatchupCard, {
  TIEBREAKER_BOWL_NAME,
} from "../constants/PickMatchupCard";
import { useScoreboard } from "../context/NCAAFDataContext";
import "../styles/pick-form.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PickForm = ({ onSubmitResult }) => {
  const { email } = useAuth();
  const { profile } = useUserProfile();
  const { games: scoreboardGames, loading, error } = useScoreboard();
  const {
    currentEntry,
    currentEntryStatus,
    defaultContactEmail,
    picksLoading,
    saveCurrentPicks,
    savedSelectionsByGameId,
  } = useAppData();
  const picksClosed = false;
  const [picks, setPicks] = useState({});
  const [entryName, setEntryName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tieBreaker, setTieBreaker] = useState("");
  const [hasSubmitAttempt, setHasSubmitAttempt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPicks(savedSelectionsByGameId || {});
  }, [savedSelectionsByGameId]);

  useEffect(() => {
    const fallbackName = profile?.username ? `${profile.username}'s Picks` : "";
    setEntryName(currentEntry?.entryName || fallbackName);
  }, [currentEntry?.entryName, profile?.username]);

  useEffect(() => {
    setContactEmail(currentEntry?.contactEmail || defaultContactEmail || email || "");
  }, [currentEntry?.contactEmail, defaultContactEmail, email]);

  useEffect(() => {
    setTieBreaker(
      currentEntry?.tieBreakerValue === null ||
        currentEntry?.tieBreakerValue === undefined
        ? ""
        : String(currentEntry.tieBreakerValue)
    );
  }, [currentEntry?.tieBreakerValue]);

  const games = useMemo(() => {
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

      return {
        id: game?.id,
        bowlName: game?.bowl || "Bowl Game Not Found",
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
  const trimmedEmail = contactEmail.trim();
  const hasEntryName = trimmedName.length > 0;
  const hasEmail = trimmedEmail.length > 0;
  const emailIsValid = hasEmail ? emailPattern.test(trimmedEmail) : false;
  const nameError = hasSubmitAttempt && !hasEntryName;
  const emailError = hasSubmitAttempt && (!hasEmail || !emailIsValid);
  const selectedCount = Object.values(picks).filter(Boolean).length;
  const hasAtLeastOnePick = selectedCount > 0;
  const allPicksMade =
    games.length > 0 && games.every((game) => Boolean(picks?.[game.id]));
  const isCompleteSet = allPicksMade;
  const submitLabel = isCompleteSet ? "Save Picks" : "Save Draft";

  const clearValidityMessage = (event) => {
    event.target.setCustomValidity("");
  };

  const setValidityMessage = (event, message) => {
    event.target.setCustomValidity(message);
  };

  const handleSelect = (gameId, teamCode) => {
    setPicks((previous) => ({
      ...previous,
      [gameId]: teamCode,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setHasSubmitAttempt(true);

    if (picksClosed) {
      onSubmitResult?.({
        message: "Bowl season coming soon. Picks will open once games are set.",
        severity: "info",
      });
      return;
    }

    if (!hasEntryName) {
      onSubmitResult?.({
        message: "Please enter a name for your entry before saving picks.",
        severity: "error",
      });
      return;
    }

    if (!hasEmail || !emailIsValid) {
      onSubmitResult?.({
        message: "Please enter a valid email before saving picks.",
        severity: "error",
      });
      return;
    }

    if (!hasAtLeastOnePick) {
      onSubmitResult?.({
        message: "Select at least one winner before saving your picks.",
        severity: "error",
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveCurrentPicks({
        entryName: trimmedName,
        contactEmail: trimmedEmail,
        selectionsByGameId: picks,
        tieBreakerValue: tieBreaker,
        userProfileId: profile?.id,
      });

      onSubmitResult?.({
        message:
          result.status === "COMPLETE"
            ? "Your picks were saved and this entry is complete."
            : "Your draft picks were saved.",
        severity: "success",
      });
    } catch (saveError) {
      onSubmitResult?.({
        message:
          saveError?.message ||
          "Your picks could not be saved right now. Please try again.",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || picksLoading) {
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
    <form className="pick-form-container" onSubmit={handleSubmit} noValidate>
      {games.length === 0 ? (
        <div className="empty-state">No bowl matchups available right now.</div>
      ) : null}
      {games.map((game) => (
        <PickMatchupCard
          key={game.id}
          {...game}
          selection={picks?.[game.id]}
          onSelect={handleSelect}
          setTieBreaker={setTieBreaker}
          tieBreaker={tieBreaker}
        />
      ))}
      <div className="pick-form-header">
        <div className="pick-form-field">
          <TextField
            label="Add a Name to Your Picks"
            placeholder="Name your entry"
            value={entryName}
            onChange={(event) => {
              setEntryName(event.target.value);
            }}
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
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
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
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
      {currentEntry ? (
        <div className="pick-form-header">
          <div className="pick-form-field">
            Saved {selectedCount} of {games.length} picks. Status: {currentEntryStatus}.
          </div>
          <div className="pick-form-field">
            Tie-breaker bowl: {TIEBREAKER_BOWL_NAME}
          </div>
        </div>
      ) : null}
      {picksClosed ? (
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
      ) : null}
    </form>
  );
};

export default PickForm;

import { useEffect, useState } from "react";
import { displayLeaderboardUsername } from "../features/leaderboard/leaderboardViewModel";
import "../styles/winners-podium.css";

const PLACE_LABELS = {
  1: "1st Place",
  2: "2nd Place",
  3: "3rd Place",
  4: "4th Place",
};

const SUGGESTION_FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLSdhT2HsTOlYrxxN9_YpXvSJs68uQJFXNBg7tMMhWFxib3sUNQ/formResponse";
const SUGGESTION_FIELD_ID = "entry.187247892";
const SUGGESTION_COOLDOWN_MS = 60 * 60 * 1000;
const SUGGESTION_COOLDOWN_KEY = "bowlSuggestionsCooldownUntil";

const WinnersPodium = ({ season, winners = [], tiebreakerTotal = null }) => {
  const [suggestion, setSuggestion] = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const savedCooldown = Number(
      localStorage.getItem(SUGGESTION_COOLDOWN_KEY) || "0",
    );
    setCooldownUntil(savedCooldown);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, cooldownUntil - now);
  const isCoolingDown = remainingMs > 0;

  const handleSuggestionChange = (event) => {
    setSuggestion(event.target.value);
    if (submitState !== "idle") {
      setSubmitState("idle");
      setSubmitMessage("");
    }
  };

  const handleSuggestionSubmit = async (event) => {
    event.preventDefault();
    const trimmed = suggestion.trim();
    if (!trimmed) {
      setSubmitState("error");
      setSubmitMessage("Please add a suggestion before submitting.");
      return;
    }

    setSubmitState("sending");
    setSubmitMessage("");
    try {
      const body = new URLSearchParams();
      body.append(SUGGESTION_FIELD_ID, trimmed);
      body.append("submit", "Submit");
      await fetch(SUGGESTION_FORM_ACTION, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: body.toString(),
      });
      const nextCooldown = Date.now() + SUGGESTION_COOLDOWN_MS;
      localStorage.setItem(SUGGESTION_COOLDOWN_KEY, String(nextCooldown));
      setCooldownUntil(nextCooldown);
      setSubmitState("success");
      setSubmitMessage("Thanks! Your suggestion was sent.");
      setSuggestion("");
    } catch (err) {
      setSubmitState("error");
      setSubmitMessage("Could not send suggestion. Please try again.");
    }
  };

  return (
    <section className="winners-podium" aria-label="Season winners podium">
      <div className="winners-podium__header">
        <p className="winners-podium__eyebrow">
          {season?.name || "Previous season"}
        </p>
        <h2 className="winners-podium__title">PREVIOUS SEASON RESULTS</h2>
        <p className="winners-podium__subtitle">
          {winners.length
            ? "CONGRATS TO OUR WINNERS!"
            : "RESULTS WILL APPEAR WHEN AVAILABLE"}
        </p>
        <p className="winners-podium__meta">
          {tiebreakerTotal === null
            ? "Final tiebreaker total unavailable"
            : `Tiebreaker total: ${tiebreakerTotal}`}
        </p>
      </div>

      <div className="winners-podium__grid-card">
        <div className="winners-podium__grid">
          {winners.length === 0 ? (
            <p>Previous season results are not available yet.</p>
          ) : null}
          {winners.map((winner) => (
            <div
              key={winner.place}
              className={`winners-podium__card winners-podium__card--grid place-${winner.place}`}
            >
              <div className="winners-podium__place">
                {PLACE_LABELS[winner.place]}
              </div>
              <div className="winners-podium__name">
                {displayLeaderboardUsername(winner.name)}
              </div>
              <div className="winners-podium__badges">
                <span className="winners-podium__badge">
                  {winner.picks} picks
                </span>
                {winner.tiebreakerMargin !== null ? (
                  <span className="winners-podium__badge winners-podium__badge--margin">
                    Tie Breaker Margin {winner.tiebreakerMargin}
                  </span>
                ) : null}
                {winner.winnings !== undefined ? (
                  <span className="winners-podium__badge winners-podium__badge--cash">
                    {`$${winner.winnings} winnings`}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="winners-podium__suggestions">
        <div className="winners-podium__suggestions-card">
          <div className="winners-podium__suggestions-header">
            <p className="winners-podium__suggestions-kicker">
              Off-Season Notes
            </p>
            <h3 className="winners-podium__suggestions-title">
              Suggestion Box
            </h3>
          </div>
          <p className="winners-podium__suggestions-copy">
            What should we improve next season? Scoring tweaks, new features or
            anything else that would make the experience better.
          </p>
          <form
            className="winners-podium__suggestions-form"
            onSubmit={handleSuggestionSubmit}
            noValidate
          >
            <textarea
              id="suggestion-input"
              name="suggestion"
              rows={5}
              value={suggestion}
              onChange={handleSuggestionChange}
              placeholder="Tell us what would make next season better."
              className="winners-podium__suggestions-textarea"
              required
            />
            <div className="winners-podium__suggestions-actions">
              <button
                type="submit"
                className="winners-podium__suggestions-button"
                disabled={submitState === "sending" || isCoolingDown}
              >
                {submitState === "sending"
                  ? "Sending..."
                  : isCoolingDown
                    ? `Thank you, try again later.`
                    : "Submit Suggestion"}
              </button>
              {submitMessage ? (
                <span
                  className={`winners-podium__suggestions-status ${submitState}`}
                  role={submitState === "error" ? "alert" : undefined}
                >
                  {submitMessage}
                </span>
              ) : null}
            </div>
          </form>
          <p className="winners-podium__suggestions-footer">
            Built by{" "}
            <span role="img" aria-label="bicep">
              &#128170;
            </span>{" "}
            Two-Jakes
          </p>
        </div>
      </div>
    </section>
  );
};

export default WinnersPodium;

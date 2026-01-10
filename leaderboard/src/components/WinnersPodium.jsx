import { useEffect, useState } from "react";
import "../styles/winners-podium.css";

const TIEBREAKER_TOTAL = 61;

const WINNERS = [
  {
    place: 1,
    name: "Jeff Gumm",
    picks: 25,
    winnings: 110,
    tiebreakerGuess: 48,
  },
  {
    place: 2,
    name: "David Newell",
    picks: 25,
    winnings: 50,
    tiebreakerGuess: 42,
  },
  {
    place: 3,
    name: "Blythe",
    picks: 24,
    winnings: 30,
    tiebreakerGuess: 57,
  },
  {
    place: 4,
    name: "Roll Tide!!!",
    picks: 24,
    winnings: 10,
    tiebreakerGuess: 53,
  },
];

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

const WinnersPodium = () => {
  const winners = WINNERS.map((winner) => ({
    ...winner,
    tiebreakerMargin: Math.abs(TIEBREAKER_TOTAL - winner.tiebreakerGuess),
  })).sort((a, b) => a.place - b.place);
  const [suggestion, setSuggestion] = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const savedCooldown = Number(
      localStorage.getItem(SUGGESTION_COOLDOWN_KEY) || "0"
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
        <p className="winners-podium__eyebrow">Bowl Season 2025</p>
        <h2 className="winners-podium__title">
          BOWL SEASON IS OVER SEE YOU NEXT YEAR
        </h2>
        <p className="winners-podium__subtitle">CONGRATS TO OUR WINNERS!</p>
        <p className="winners-podium__meta">
          Tiebreaker total: {TIEBREAKER_TOTAL}
        </p>
      </div>

      <div className="winners-podium__grid-card">
        <div className="winners-podium__grid">
          {winners.map((winner) => (
            <div
              key={winner.place}
              className={`winners-podium__card winners-podium__card--grid place-${winner.place}`}
            >
              <div className="winners-podium__place">{PLACE_LABELS[winner.place]}</div>
              <div className="winners-podium__name">{winner.name}</div>
              <div className="winners-podium__badges">
                <span className="winners-podium__badge">
                  {winner.picks} picks
                </span>
                <span className="winners-podium__badge winners-podium__badge--margin">
                  Tie Breaker Margin {winner.tiebreakerMargin}
                </span>
                <span className="winners-podium__badge winners-podium__badge--cash">
                  {`$${winner.winnings} winnings`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="winners-podium__suggestions">
        <div className="winners-podium__suggestions-card">
          <div className="winners-podium__suggestions-header">
            <p className="winners-podium__suggestions-kicker">Off-Season Notes</p>
            <h3 className="winners-podium__suggestions-title">Suggestion Box</h3>
          </div>
          <p className="winners-podium__suggestions-copy">
            What should we improve next season? Scoring tweaks, new features or anything else that would make the experience better.
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
                    : "Submit suggestion"}
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
            Built by <span role="img" aria-label="bicep">&#128170;</span> Two-Jakes
          </p>
        </div>
      </div>
    </section>
  );
};

export default WinnersPodium;

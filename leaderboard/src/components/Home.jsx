import "../styles/home.css";

const ENTRY_COIN = "bobs"
const ENTRY_TOKEN = "picks"

const Home = ({ onNavigate, isLocked, loginHelper, gamesStarted }) => {
  const handleSubmit = (event) => {
    event.preventDefault();

    const validCoin = ENTRY_COIN === event.target[0].value;
    const validToken = ENTRY_TOKEN === event.target[1].value;
    loginHelper(validCoin && validToken)
  };

  const navigateTo = (pageId) => {
    if (typeof onNavigate === "function" && pageId) {
      onNavigate(pageId);
    }
  };

  return (
    <section className="home-page">
      <div className="home-hero">
        <div className="home-about">
          <p className="home-eyebrow">Bowl Season 2025</p>
          <h1>Bob's Bowl Game Pick 'em</h1>
          <p className="home-lede">
            Friendly bragging rights, live scores, and every pick lined up in
            one place. Spin up your entry, track the leaderboard, and follow the
            action as each bowl kicks off.
          </p>

          <div className="home-pills" aria-label="Highlights">
            <span className="pill pill-blue">Live score sync</span>
            <span className="pill pill-gold">Auto updated leaderboard</span>
            <span className="pill pill-green">Make your picks</span>
          </div>

          <ul className="home-list">
            <li>See every matchup at a glance with real-time ESPN updates.</li>
            <li>Compare friends side-by-side and settle tie-breakers fast.</li>
            <li>Stay organized so you can enjoy the games, not spreadsheets.</li>
          </ul>
        </div>

        <div className="home-login" aria-labelledby="login-heading">
          {gamesStarted ? (
            <>
              <div className="login-card">
                <div className="login-header">
                  <h2 id="login-heading">{isLocked ? "Sign In to Access" : "Welcome to Bowl Picks"}</h2>
                  <p className="login-subtext">
                    {isLocked ?
                      "Authentication is still being finalized. Ask Bob or Jake for default password to get access." :
                      "View the current leaderboard, view everybody's picks, or check out the live scores!"
                    }
                  </p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                  {isLocked ? (
                    <>
                      <label htmlFor='login-email'>Username</label>
                      <input
                        id='login-email'
                        name='email'
                        type='text'
                        autoComplete='username'
                        placeholder='username'
                        required
                      />

                      <label htmlFor='login-password'>
                        Password <span className='label-optional'>(placeholder)</span>
                      </label>

                      <input
                        id='login-password'
                        name='password'
                        type='password'
                        autoComplete='current-password'
                        placeholder='••••••••'
                        required
                      />

                      <button type="submit" className="home-btn primary full">
                        Log in
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="home-btn tertiary full"
                        onClick={() => navigateTo("leaderboard")}
                      >
                        Leaderboard
                      </button>
                      <button
                        type="button"
                        className="home-btn secondary full"
                        onClick={() => navigateTo("all-picks")}
                      >
                        All Picks
                      </button>
                      <button
                        type="button"
                        className="home-btn primary full"
                        onClick={() => navigateTo("schedule-view")}
                      >
                        Scores
                      </button>
                    </>
                  )
                  }
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="login-card">
                <div className="login-header">
                  <h2 id="login-heading">{isLocked ? "Sign In to Access" : "Enter Picks Below or Continue to Leaderboard"}</h2>
                  <p className="login-subtext">
                    {isLocked ?
                      "Authentication is still being finalized. Ask Bob or Jake for default password to get access." :
                      <p>
                        Please, only fill out one entry form per participant. ONCE FORM IS SUBMITTED THERE IS NO EDITING YOUR PICKS. $5 entry fee per participant,
                        get cash to Bob or venmo Jake (<a
                          href="https://venmo.com/u/Jake-Koons"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          @Jake-Koons
                        </a>). All picks must be submitted before kickoff of the first game.
                      </p>}
                  </p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                  {isLocked ? (
                    <>
                      <label htmlFor='login-email'>Username</label>
                      <input
                        id='login-email'
                        name='email'
                        type='text'
                        autoComplete='username'
                        placeholder='username'
                        required
                      />

                      <label htmlFor='login-password'>
                        Password <span className='label-optional'>(placeholder)</span>
                      </label>

                      <input
                        id='login-password'
                        name='password'
                        type='password'
                        autoComplete='current-password'
                        placeholder='••••••••'
                        required
                      />

                      <button type="submit" className="home-btn primary full">
                        Log in
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="home-btn secondary full"
                        onClick={() => navigateTo("picks")}
                      >
                        Enter Your Picks
                      </button>
                      <button
                        type="button"
                        className="home-btn tertiary full"
                        onClick={() => navigateTo("leaderboard")}
                      >
                        Leaderboard
                      </button>
                    </>
                  )
                  }
                </form>
              </div>
            </>)}
        </div>
      </div>
    </section>
  );
};

export default Home;

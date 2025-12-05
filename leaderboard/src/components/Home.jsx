import "../styles/home.css";

const Home = ({ onNavigate }) => {
  const handleSubmit = (event) => {
    event.preventDefault();
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
          <h1>Bob&apos;s Bowl Game Pick &apos;em</h1>
          <p className="home-lede">
            Friendly bragging rights, live scores, and every pick lined up in
            one place. Spin up your entry, track the leaderboard, and follow the
            action as each bowl kicks off.
          </p>

          <div className="home-pills" aria-label="Highlights">
            <span className="pill pill-blue">Live score sync</span>
            <span className="pill pill-gold">Auto updated leaderboard</span>
            <span className="pill pill-outline">Make your picks</span>
          </div>

          <ul className="home-list">
            <li>See every matchup at a glance with real-time ESPN updates.</li>
            <li>Compare friends side-by-side and settle tie-breakers fast.</li>
            <li>Stay organized so you can enjoy the games, not spreadsheets.</li>
          </ul>
        </div>

        <div className="home-login" aria-labelledby="login-heading">
          <div className="login-card">
            <div className="login-header">
              <h2 id="login-heading">Sign In to Access</h2>
              <p className="login-subtext">
                Authentication is still being finalized. Use the form to picture
                the flow, or continue straight to picks and the leaderboard.
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="login-email">Username</label>
              <input
                id="login-email"
                name="email"
                type="text"
                autoComplete="username"
                placeholder="username"
                required
              />

              <label htmlFor="login-password">
                Password <span className="label-optional">(placeholder)</span>
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />

              <button type="submit" className="home-btn primary full">
                Log in
              </button>
              <button
                type="button"
                className="home-btn ghost full"
                onClick={() => navigateTo("leaderboard")}
              >
                View leaderboard as guest
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;

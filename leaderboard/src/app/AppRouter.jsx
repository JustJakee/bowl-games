// ROUTING — NAVIGATION — REACT ROUTER
import { Navigate, Route, Routes } from "react-router-dom";
import AuthenticatedApp from "./AuthenticatedApp.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import LeaderboardPage from "../pages/LeaderboardPage.jsx";
import PicksPage from "../pages/PicksPage.jsx";
import EntriesPage from "../pages/EntriesPage.jsx";
import GameDetailPage from "../pages/GameDetailPage.jsx";
import SchedulePage from "../pages/SchedulePage.jsx";
import RulesPage from "../pages/RulesPage.jsx";
import MorePage from "../pages/MorePage.jsx";
import ScrollToTop from "../layout/ScrollToTop.jsx";

const AppRouter = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AuthenticatedApp />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/picks" element={<PicksPage />} />
          <Route path="/entries" element={<EntriesPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/schedule/:gameId" element={<GameDetailPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
};

export default AppRouter;

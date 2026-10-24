import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./layout/AppShell";
import { LoginPage } from "./pages/auth/LoginPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { JoinPage } from "./pages/tournaments/join/JoinPage";
import { OverviewPage } from "./pages/tournaments/overview/OverviewPage";
import { FormPage } from "./pages/tournaments/form/FormPage";
import { GuestInvitePage } from "./pages/tournaments/invitations/GuestInvitePage";
import { JoinRequestsPage } from "./pages/tournaments/requests/JoinRequestsPage";
import { DetailsPage as MatchDetailsPage } from "./pages/tournaments/matches/DetailsPage";
import { EditPage as MatchEditPage } from "./pages/tournaments/matches/EditPage";
import { FormPage as MatchFormPage } from "./pages/tournaments/matches/FormPage";
import { ListPage as MatchListPage } from "./pages/tournaments/matches/ListPage";
import { DetailsPage as PlayerDetailsPage } from "./pages/tournaments/players/DetailsPage";
import { EditPage as PlayerEditPage } from "./pages/tournaments/players/EditPage";
import { ListPage as PlayerListPage } from "./pages/tournaments/players/ListPage";
import { StandingsPage } from "./pages/tournaments/standings/StandingsPage";
import { DetailsPage as TeamDetailsPage } from "./pages/tournaments/teams/DetailsPage";
import { EditPage as TeamEditPage } from "./pages/tournaments/teams/EditPage";
import { ListPage as TeamListPage } from "./pages/tournaments/teams/ListPage";
import { TierlistPage } from "./pages/tournaments/tierlist/TierlistPage";
import { HomePage } from "./pages/tournaments/home/HomePage";

function App() {
    const location = useLocation();

    return (
        <Routes key={location.pathname}>
            <Route element={<LoginPage />} path="/" />

            <Route
                element={
                    <ProtectedRoute>
                        <AppShell />
                    </ProtectedRoute>
                }
            >
                <Route element={<HomePage />} path="/tournaments" />
                <Route element={<ProfilePage />} path="/profile" />
                <Route
                    element={<JoinPage />}
                    path="/tournaments/join"
                />
                <Route
                    element={<OverviewPage />}
                    path="/tournaments/:tournamentId"
                />
                <Route
                    element={<MatchListPage />}
                    path="/tournaments/:tournamentId/partidos"
                />
                <Route
                    element={<MatchDetailsPage />}
                    path="/tournaments/:tournamentId/partidos/:matchId"
                />
                <Route
                    element={<MatchEditPage />}
                    path="/tournaments/:tournamentId/partidos/:matchId/edit"
                />
                <Route
                    element={<MatchFormPage />}
                    path="/tournaments/:tournamentId/partidos/new"
                />
                <Route
                    element={<StandingsPage />}
                    path="/tournaments/:tournamentId/tabla"
                />
                <Route
                    element={<TierlistPage />}
                    path="/tournaments/:tournamentId/tierlist"
                />
                <Route
                    element={<FormPage />}
                    path="/tournaments/new"
                />
                <Route
                    element={<FormPage />}
                    path="/tournaments/:tournamentId/edit"
                />
                <Route
                    element={<PlayerListPage />}
                    path="/tournaments/:tournamentId/players"
                />
                <Route
                    element={<TeamListPage />}
                    path="/tournaments/:tournamentId/teams"
                />
                <Route
                    element={<TeamDetailsPage />}
                    path="/tournaments/:tournamentId/teams/:teamId"
                />
                <Route
                    element={<TeamEditPage />}
                    path="/tournaments/:tournamentId/teams/:teamId/edit"
                />
                <Route
                    element={<PlayerDetailsPage />}
                    path="/tournaments/:tournamentId/players/:playerId"
                />
                <Route
                    element={<PlayerEditPage />}
                    path="/tournaments/:tournamentId/players/:playerId/edit"
                />
                <Route
                    element={<GuestInvitePage />}
                    path="/tournaments/:tournamentId/invite-guest"
                />
                <Route
                    element={<JoinRequestsPage />}
                    path="/tournaments/:tournamentId/join-requests"
                />
            </Route>

            <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
    );
}

export default App;

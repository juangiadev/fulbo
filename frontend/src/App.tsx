import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { JoinTournamentPage } from './pages/tournaments/JoinTournamentPage';
import { TournamentDetailsPage } from './pages/tournaments/TournamentDetailsPage';
import { TournamentFormPage } from './pages/tournaments/TournamentFormPage';
import { TournamentInviteGuestPage } from './pages/tournaments/TournamentInviteGuestPage';
import { TournamentJoinRequestsPage } from './pages/tournaments/TournamentJoinRequestsPage';
import { TournamentMatchDetailsPage } from './pages/tournaments/TournamentMatchDetailsPage';
import { TournamentMatchEditPage } from './pages/tournaments/TournamentMatchEditPage';
import { TournamentMatchFormPage } from './pages/tournaments/TournamentMatchFormPage';
import { TournamentMatchesPage } from './pages/tournaments/TournamentMatchesPage';
import { TournamentPlayerDetailsPage } from './pages/tournaments/TournamentPlayerDetailsPage';
import { TournamentPlayerEditPage } from './pages/tournaments/TournamentPlayerEditPage';
import { TournamentPlayersPage } from './pages/tournaments/TournamentPlayersPage';
import { TournamentTablePage } from './pages/tournaments/TournamentTablePage';
import { TournamentsPage } from './pages/tournaments/TournamentsPage';

function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/" />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route element={<TournamentsPage />} path="/tournaments" />
        <Route element={<JoinTournamentPage />} path="/tournaments/join" />
        <Route element={<TournamentDetailsPage />} path="/tournaments/:tournamentId" />
        <Route element={<TournamentMatchesPage />} path="/tournaments/:tournamentId/partidos" />
        <Route element={<TournamentMatchDetailsPage />} path="/tournaments/:tournamentId/partidos/:matchId" />
        <Route element={<TournamentMatchEditPage />} path="/tournaments/:tournamentId/partidos/:matchId/edit" />
        <Route element={<TournamentMatchFormPage />} path="/tournaments/:tournamentId/partidos/new" />
        <Route element={<TournamentTablePage />} path="/tournaments/:tournamentId/tabla" />
        <Route element={<TournamentFormPage />} path="/tournaments/new" />
        <Route element={<TournamentFormPage />} path="/tournaments/:tournamentId/edit" />
        <Route element={<TournamentPlayersPage />} path="/tournaments/:tournamentId/players" />
        <Route
          element={<TournamentPlayerDetailsPage />}
          path="/tournaments/:tournamentId/players/:playerId"
        />
        <Route
          element={<TournamentPlayerEditPage />}
          path="/tournaments/:tournamentId/players/:playerId/edit"
        />
        <Route element={<TournamentInviteGuestPage />} path="/tournaments/:tournamentId/invite-guest" />
        <Route element={<TournamentJoinRequestsPage />} path="/tournaments/:tournamentId/join-requests" />
      </Route>

      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

export default App;

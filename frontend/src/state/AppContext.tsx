/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { DisplayPreference } from "@shared/enums";
import { PlayerRole } from "@shared/enums";
import type { UserProfile } from "@shared/contracts";
import type { TournamentContract } from "@shared/contracts";
import { apiClient, setAccessTokenProvider } from "../api/client";
import type { AppData } from "../types/app";

interface AppContextValue {
  data: AppData;
  currentUser: UserProfile;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  loadTournaments: () => Promise<void>;
  getMyRole: (tournamentId: string) => PlayerRole | null;
  createTournament: (input: {
    name: string;
    visibility: string;
  }) => Promise<TournamentContract>;
  updateTournament: (
    id: string,
    input: Partial<TournamentContract>,
  ) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  updateProfile: (input: Partial<UserProfile>) => Promise<void>;
}

const emptyUser: UserProfile = {
  id: "pending",
  auth0Id: "auth0|pending",
  email: "pending@fulboapp.local",
  name: "Usuario",
  nickname: "Usuario",
  imageUrl: null,
  favoriteTeamSlug: null,
  displayPreference: DisplayPreference.IMAGE,
  finishedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const emptyData: AppData = {
  users: [],
  tournaments: [],
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    user,
  } = useAuth0();

  const [data, setData] = useState<AppData>(emptyData);
  const [currentUser, setCurrentUser] = useState<UserProfile>(emptyUser);
  const [isSessionReady, setIsSessionReady] = useState(true);
  const [rolesByTournament, setRolesByTournament] = useState<
    Record<string, PlayerRole | null>
  >({});

  const loadTournaments = useCallback(async () => {
    const userId = currentUser.id;
    const tournaments = await apiClient.getTournaments();
    const rolesEntries = await Promise.all(
      tournaments.map(async (tournament) => {
        try {
          const players = await apiClient.getPlayers(tournament.id);
          const me = players.find((player) => player.userId === userId);
          return [tournament.id, me?.role ?? null] as const;
        } catch {
          return [tournament.id, null] as const;
        }
      }),
    );

    setData((prev) => ({ ...prev, tournaments }));
    setRolesByTournament(Object.fromEntries(rolesEntries));
  }, [currentUser.id]);

  useEffect(() => {
    const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined;
    setAccessTokenProvider(async () =>
      getAccessTokenSilently({
        authorizationParams: audience ? { audience } : undefined,
      }),
    );

    return () => {
      setAccessTokenProvider(null);
    };
  }, [getAccessTokenSilently]);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }
        setData(emptyData);
        setCurrentUser(emptyUser);
        setRolesByTournament({});
        setIsSessionReady(true);
      });
      return;
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setIsSessionReady(false);
      }
    });

    void (async () => {
      const me = await apiClient.syncMe({
        email: user?.email,
        name: user?.name,
        nickname: user?.nickname,
        picture: user?.picture,
      });
      const users = await apiClient.getUsers();
      if (cancelled) {
        return;
      }

      setCurrentUser(me);
      setData((prev) => ({ ...prev, users }));

      const tournaments = await apiClient.getTournaments();
      if (cancelled) {
        return;
      }

      const rolesEntries = await Promise.all(
        tournaments.map(async (tournament) => {
          try {
            const players = await apiClient.getPlayers(tournament.id);
            const mePlayer = players.find((player) => player.userId === me.id);
            return [tournament.id, mePlayer?.role ?? null] as const;
          } catch {
            return [tournament.id, null] as const;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setData((prev) => ({ ...prev, tournaments }));
      setRolesByTournament(Object.fromEntries(rolesEntries));
      setIsSessionReady(true);
    })().catch(() => {
      if (!cancelled) {
        setIsSessionReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  const login = useCallback(async () => {
    await loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
    setData(emptyData);
    setCurrentUser(emptyUser);
    setRolesByTournament({});
  }, [auth0Logout]);

  const getMyRole = useCallback(
    (tournamentId: string) => rolesByTournament[tournamentId] ?? null,
    [rolesByTournament],
  );

  const createTournament = useCallback(
    async (input: { name: string; visibility: string }) => {
      const createdTournament = await apiClient.createTournament(input);
      try {
        await loadTournaments();
      } catch {
        setData((prev) => ({
          ...prev,
          tournaments: [createdTournament, ...prev.tournaments],
        }));
      }

      return createdTournament;
    },
    [loadTournaments],
  );

  const updateTournament = useCallback(
    async (id: string, input: Partial<TournamentContract>) => {
      await apiClient.updateTournament(id, input);
      await loadTournaments();
    },
    [loadTournaments],
  );

  const deleteTournament = useCallback(
    async (id: string) => {
      await apiClient.deleteTournament(id);
      await loadTournaments();
    },
    [loadTournaments],
  );

  const updateProfile = useCallback(async (input: Partial<UserProfile>) => {
    const profile = await apiClient.updateMe(input);
    setCurrentUser(profile);
    setData((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === profile.id ? profile : user,
      ),
    }));
  }, []);

  const isAuthLoading = auth0Loading || (isAuthenticated && !isSessionReady);
  const isLoggedIn = isAuthenticated && !isAuthLoading;

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      currentUser,
      isLoggedIn,
      isAuthLoading,
      login,
      logout,
      loadTournaments,
      getMyRole,
      createTournament,
      updateTournament,
      deleteTournament,
      updateProfile,
    }),
    [
      currentUser,
      data,
      createTournament,
      deleteTournament,
      getMyRole,
      isAuthLoading,
      isLoggedIn,
      loadTournaments,
      login,
      logout,
      updateProfile,
      updateTournament,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import { Toaster } from "sileo";
import App from "./App";
import "./index.css";
import { AppProvider } from "./state/AppContext";

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE;
const auth0RedirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI ?? window.location.origin;

if (!auth0Domain || !auth0ClientId) {
  throw new Error("Missing Auth0 frontend config: VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0Provider
        authorizationParams={{
          audience: auth0Audience,
          redirect_uri: auth0RedirectUri,
        }}
        cacheLocation="localstorage"
        clientId={auth0ClientId}
        domain={auth0Domain}
        useRefreshTokens
      >
        <AppProvider>
          <Toaster position="top-center" />
          <App />
        </AppProvider>
      </Auth0Provider>
    </BrowserRouter>
  </StrictMode>,
);

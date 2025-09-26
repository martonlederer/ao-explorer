import BrowserWalletStrategy from "@arweave-wallet-kit/browser-wallet-strategy";
import ArConnectStrategy from "@arweave-wallet-kit/arconnect-strategy";
import WebWalletStrategy from "@arweave-wallet-kit/webwallet-strategy";
import { ArweaveWalletKit } from "@arweave-wallet-kit/react";
import { pathToRegexp, Key } from "path-to-regexp";
import { Router, Route, Switch, Redirect } from "wouter";
import makeCachedMatcher from "wouter/matcher";
import useGateway from "./hooks/useGateway";
import useHashLocation from "./utils/hash";
import { styled } from "@linaria/react";
import { css } from "@linaria/core";
import Nav from "./components/Nav";
import Home from "./pages";
import { MarkedProvider } from "./components/MarkedProvider";
import { ApolloClient, ApolloProvider, NormalizedCacheObject } from "@apollo/client";
import { setupApollo } from "./utils/gql_client";
import { useEffect, useState } from "react";
import { CurrentTransactionProvider } from "./components/CurrentTransactionProvider";
import Entity from "./pages/entity";
import Block from "./pages/block";
import Footer from "./components/Footer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const convertPathToRegexp = (path: string) => {
  let keys: Key[] = [];

  const regexp = pathToRegexp(path, keys, { strict: true });
  return { keys, regexp };
};

const customMatcher = makeCachedMatcher(convertPathToRegexp);
const queryClient = new QueryClient();

function App() {
  const gateway = useGateway();
  const [apolloAoClient, setAoApolloClient] = useState<ApolloClient<NormalizedCacheObject> | undefined>();
  const [apolloArClient, setArApolloClient] = useState<ApolloClient<NormalizedCacheObject> | undefined>();

  useEffect(() => {
    setupApollo("https://ao-search-gateway.goldsky.com/graphql")
      .then((client) => setAoApolloClient(client))
      .catch((e) => console.log("Failed to setup Apollo AO Client: " + (e?.message || e)));
  }, []);

  useEffect(() => {
    setupApollo("https://arweave-search.goldsky.com/graphql")
      .then((client) => setArApolloClient(client))
      .catch((e) => console.log("Failed to setup Apollo Arweave Client: " + (e?.message || e)));
  }, []);

  if (!apolloAoClient || !apolloArClient) return <></>;

  return (
    <ArweaveWalletKit
      theme={{
        displayTheme: "dark",
        accent: {
          r: 48,
          g: 175,
          b: 46
        }
      }}
      config={{
        strategies: [
          new ArConnectStrategy(),
          new WebWalletStrategy(),
          new BrowserWalletStrategy()
        ],
        permissions: ["ACCESS_ADDRESS", "ACCESS_ALL_ADDRESSES", "SIGN_TRANSACTION"],
        ensurePermissions: true,
        appInfo: {
          name: "ao Explorer",
          logo: `${gateway}/tQUcL4wlNj_NED2VjUGUhfCTJ6pDN9P0e3CbnHo3vUE`
        },
        gatewayConfig: {
          host: "arweave.net",
          port: 443,
          protocol: "https"
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <CurrentTransactionProvider>
          <MarkedProvider>
            <>
              <BgBlur />
              <Router hook={useHashLocation} matcher={customMatcher}>
                <Nav />
                <Main>
                  <Switch>
                    <Route path="/">
                      <ApolloProvider client={apolloAoClient}>
                        <Home />
                      </ApolloProvider>
                    </Route>
                    <Route path="/:id([a-zA-Z0-9_-]{43})">
                      {(props) =>
                        <Entity
                          id={props.id}
                          apolloAoClient={apolloAoClient}
                          apolloArClient={apolloArClient}
                        />
                      }
                    </Route>
                      <Route path="/:height([0-9]+)">
                        {(props) => (
                          <ApolloProvider client={apolloArClient}>
                            <Block height={props.height} />
                          </ApolloProvider>
                        )}
                      </Route>
                    <Route path="/message/:message">
                      {(props) => <Redirect to={`/${props.message}`} />}
                    </Route>
                    <Route path="/process/:id">
                      {(props) => <Redirect to={`/${props.id}`} />}
                    </Route>
                    <Route path="/process/:id/:message">
                      {(props) => <Redirect to={`/${props.message}`} />}
                    </Route>
                  </Switch>
                </Main>
                <Footer />
              </Router>
            </>
          </MarkedProvider>
        </CurrentTransactionProvider>
      </QueryClientProvider>
    </ArweaveWalletKit>
  );
}

export const globals = css`
  :global() {
    html {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      background-color: #000;
      overflow-x: hidden;
      color: #fff;
    }

    input, button, select, textarea {
      font-family: 'Inter', sans-serif !important;
    }

    a {
      -webkit-tap-highlight-color: transparent;
    }

    ::selection {
      background-color: rgba(4, 255, 0, .3);
      color: #04ff00;
    }
  }
`;

const Main = styled.main`
  z-index: 2;
`;

const BgBlur = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 80vh;
  background-image: url('/bg.png');
  background-size: cover;
  background-repeat: no-repeat;
  z-index: -1;
`;

export default App;

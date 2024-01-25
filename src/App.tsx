import BrowserWalletStrategy from "@arweave-wallet-kit/browser-wallet-strategy";
import ArConnectStrategy from "@arweave-wallet-kit/arconnect-strategy";
import WebWalletStrategy from "@arweave-wallet-kit/webwallet-strategy";
import { ArweaveWalletKit } from "@arweave-wallet-kit/react";
import { pathToRegexp, Key } from "path-to-regexp";
import { Router, Route, Switch } from "wouter";
import makeCachedMatcher from "wouter/matcher";
import useHashLocation from "./utils/hash";
import { styled } from "@linaria/react";
import Process from "./pages/process";
import { css } from "@linaria/core";
import Nav from "./components/Nav";
import Home from "./pages";

const convertPathToRegexp = (path: string) => {
  let keys: Key[] = [];

  const regexp = pathToRegexp(path, keys, { strict: true });
  return { keys, regexp };
};

const customMatcher = makeCachedMatcher(convertPathToRegexp);

function App() {
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
          logo: "https://arweave.net/tQUcL4wlNj_NED2VjUGUhfCTJ6pDN9P0e3CbnHo3vUE"
        },
        gatewayConfig: {
          host: "arweave.net",
          port: 443,
          protocol: "https"
        }
      }}
    >
      <BgBlur />
      <Router hook={useHashLocation} matcher={customMatcher}>
        <Nav />
        <Main>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/process/:id">
              {(props) => <Process id={props.id} />}
            </Route>
          </Switch>
        </Main>
      </Router>
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

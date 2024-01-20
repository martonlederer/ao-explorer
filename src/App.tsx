import { pathToRegexp, Key } from "path-to-regexp";
import { Router, Route, Switch } from "wouter";
import makeCachedMatcher from "wouter/matcher";
import useHashLocation from "./utils/hash";
import { styled } from "@linaria/react";
import { css } from "@linaria/core";
import Nav from "./components/Nav";
import Home from "./pages/Home";

const convertPathToRegexp = (path: string) => {
  let keys: Key[] = [];

  const regexp = pathToRegexp(path, keys, { strict: true });
  return { keys, regexp };
};

const customMatcher = makeCachedMatcher(convertPathToRegexp);

function App() {
  return (
    <>
      <BgBlur />
      <Nav />
      <Main>
        <Router hook={useHashLocation} matcher={customMatcher}>
          <Switch>
            <Route path="/" component={Home} />
          </Switch>
        </Router>
      </Main>
    </>
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

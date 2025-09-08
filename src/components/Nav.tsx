import { ConnectButton, useConnection } from "@arweave-wallet-kit/react";
import { SearchIcon } from "@iconicicons/react";
import { useEffect, useState } from "react";
import { isAddress } from "../utils/format";
import { styled } from "@linaria/react";
import { Link, useLocation } from "wouter";
import Button from "./Btn";

export default function Nav() {
  const { connect, connected } = useConnection();

  const [searchVal, setSearchVal] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAddress(searchVal)) return;
    setLocation(`#/${searchVal}`);
    setSearchVal("");
  }, [searchVal]);

  return (
    <Wrapper>
      <Link to="/">
        <HomeIcon src="/icon.svg" draggable={false} />
      </Link>
      <SearchWrapper>
        <Search />
        <SearchInput
          onChange={(e) => setSearchVal(e.target.value)}
          value={searchVal}
          placeholder="Search for a process..."
        />
      </SearchWrapper>
      {(connected && (
        <ConnectButton showProfilePicture={false} />
      )) || (
        <Button onClick={connect}>
          Connect
        </Button>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.nav`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  display: grid;
  align-items: center;
  grid-template-columns: auto 10fr 1fr;
  border-bottom: 1px solid rgba(255, 255, 255, .1);
  padding: .93rem 10vw .92rem;
  backdrop-filter: blur(20px);
  z-index: 1000;
  margin-bottom: 1.5rem;
  gap: 1rem;
  background-color: rgba(255, 255, 255, .03);
`;

const HomeIcon = styled.img`
  height: 1.2rem;
  user-select: none;
  cursor: pointer;
  transition: all .18s ease;

  &:hover {
    opacity: .88;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  background-color: transparent;
  transition: all .17s ease-in-out;

  &:focus-within {
    background-color: rgba(255, 255, 255, .03);
  }
`;

const Search = styled(SearchIcon)`
  position: absolute;
  color: #a9a9a9;
  width: 1.45rem;
  height: 1.45rem;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
`;

const SearchInput = styled.input`
  background-color: transparent;
  border: none;
  outline: none;
  color: #dddddd;
  padding: calc(.73rem + 1px) calc(1rem + 1px) calc(.73rem + 1px) calc(3.2rem + 1px);
  font-size: .9rem;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  width: calc(100% - 2px - 4.2rem);

  &::-ms-input-placeholder {
    color: #a9a9a9;
  }

  &::placeholder {
    color: #a9a9a9;
  }
`;

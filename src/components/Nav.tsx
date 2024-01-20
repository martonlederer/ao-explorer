import { SearchIcon } from "@iconicicons/react";
import { styled } from "@linaria/react"

export default function Nav() {
  return (
    <Wrapper>
      <SearchWrapper>
        <Search />
        <SearchInput placeholder="Search for a process..." />
      </SearchWrapper>
      <Button>
        Connect
      </Button>
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
  grid-template-columns: 10fr 1fr;
  border-bottom: 1px solid rgba(255, 255, 255, .1);
  padding: .93rem 10vw .92rem;
  backdrop-filter: blur(20px);
  z-index: 1000;
  margin-bottom: 1.5rem;
  gap: 1rem;
  background-color: rgba(255, 255, 255, .03);
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

const Button = styled.button`
  outline: none;
  background-color: transparent;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 8px;
  font-size: 1rem;
  text-align: center;
  cursor: pointer;
  color: #fff;
  padding: .73rem 1.65rem;
  font-size: .9rem;
  transition: all .17s ease-in-out;

  &:hover {
    background-color: rgba(255, 255, 255, .03);
  }
`;
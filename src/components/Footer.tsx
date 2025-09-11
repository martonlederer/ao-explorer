import { styled } from "@linaria/react";

export default function Footer() {
  return (
    <Wrapper>
      <Menu>
        <MenuItem href="https://discord.gg/Jad4v8ykgY" target="_blank">
          Support
        </MenuItem>
        <MenuItem href="https://forms.gle/JyQn9zV9aYcpXc9b9" target="_blank">
          Feedback
        </MenuItem>
        <MenuItem href="https://github.com/martonlederer/ao-explorer" target="_blank">
          Github
        </MenuItem>
        <MenuItem href="https://x.com/aoComputerScan" target="_blank">
          X
        </MenuItem>
      </Menu>
      <IncubatedBy>
        incubated by
        <a href="https://liquidops.io" target="_blank" rel="noopener noreferrer">
          <Logo src="/liquidops.svg" draggable={false} />
        </a>
      </IncubatedBy>
    </Wrapper>
  );
}

const Wrapper = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: .55rem 10vw;
  backdrop-filter: blur(20px);
  z-index: 1000;
  background-color: rgba(4, 255, 0, 0.03);

  a, p {
    font-size: .84rem;
    color: rgba(255, 255, 255, .7);
  }
`;

const Menu = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const MenuItem = styled.a`
  text-decoration: none;
  cursor: pointer;
  transition: all .17s ease;

  &:hover {
    opacity: .9;
  }
`;

const IncubatedBy = styled.p`
  display: flex;
  align-items: center;
  gap: .45rem;
  margin: 0;

  a {
    display: flex;
  }
`;

const Logo = styled.img`
  height: .84rem;
  user-select: none;
`;

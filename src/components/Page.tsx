import { ClipboardIcon } from "@iconicicons/react";
import { styled } from "@linaria/react";
import Table from "./Table"

export const Wrapper = styled.section`
  padding: 2rem 10vw;
`;

export const ProcessTitle = styled.h1`
  display: flex;
  align-items: baseline;
  gap: .35rem;
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0 0 .5rem;
  color: #fff;
`;

export const TokenLogo = styled.img`
  width: 1em;
  height: 1em;
  border-radius: 100%;
  user-select: none;
  object-fit: cover;
`;

export const Title = styled.h2`
  font-size: 1.35rem;
  font-weight: 600;
  color: #fff;
  margin: 1em 0 .5em;
`;

export const NotFound = styled.p`
  text-align: center;
  color: #fff;
  margin: 2rem;
`;

export const ProcessName = styled.span`
  display: flex;
  align-items: center;
  gap: .35rem;
  font-size: 1em;
  color: rgba(255, 255, 255, .7);
`;

export const ProcessID = styled.h2`
  display: flex;
  align-items: center;
  gap: .28rem;
  font-size: 1rem;
  color: rgba(255, 255, 255, .85);
  font-weight: 400;
  margin: 0 0 2.7rem;
`;

export const Copy = styled(ClipboardIcon)`
  width: 1.25rem;
  height: 1.25rem;
  color: inherit;
  cursor: pointer;
  transition: all .17s ease-in-out;

  &:hover {
    opacity: .8;
  }

  &:active {
    transform: scale(.9);
  }
`;

export const Tables = styled.div`
  width: 100%;

  ${Table} {
    width: 100%;
  }

  a {
    display: inline-flex !important;
    color: #04ff00 !important;
  }

  ${Table} tr td:first-child {
    white-space: nowrap;
  }
`;

export const Space = styled.div<{ y?: number }>`
  height: ${props => props.y?.toString() || "3"}rem;
`;

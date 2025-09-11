import { styled } from "@linaria/react";

const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
  min-height: min-content;

  td, th {
    border-left: none;
    border-right: none;
    text-align: left;
    padding: 1.05rem .7rem;
    font-weight: 400;
  }

  th {
    font-weight: 500;
  }

  td {
    color: rgba(255, 255, 255, .85);
    vertical-align: top;
  }

  tr:nth-child(even) {
    background-color: rgba(255, 255, 255, .05);
  }

  a {
    display: flex;
    align-items: center;
    gap: .26rem;
    color: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: .17s ease-in-out;

    svg {
      width: 1.05rem;
      height: 1.05rem;
      color: inherit;
    }

    &:hover {
      opacity: .8;
    }
  }
`;

export const TransactionType = styled.span`
  background-color: rgba(4, 255, 0, .23);
  color: #fff;
  text-transform: uppercase;
  padding: .2rem .28rem;
  font-size: .68rem;
`;

export default Table;

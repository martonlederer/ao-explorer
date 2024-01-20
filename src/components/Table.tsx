import { styled } from "@linaria/react";

const Table = styled.table`
  border-collapse: collapse;
  width: 100%;

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
  }

  tr:nth-child(even) {
    background-color: rgba(255, 255, 255, .05);
  }

  a {
    color: inherit;
    text-decoration: none;
    display: block;
  }
`;

export default Table;

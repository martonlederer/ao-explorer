import { styled } from "@linaria/react";
import { HTMLProps, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@apollo/client";
import { formatAddress } from "../utils/format";
import { GetTransaction } from "../queries/base";

export default function EntityLink({ address, ...props }: HTMLProps<HTMLAnchorElement> & Props) {
  const { loading, data: transaction } = useQuery(GetTransaction, {
    variables: { id: address }
  });

  const name = useMemo(
    () => {
      if (loading || !transaction?.transactions?.edges?.[0]) return undefined;
      return transaction.transactions.edges[0].node.tags.find(
        (tag) => tag.name === "Name"
      )?.value;
    },
    [loading, transaction]
  );

  return (
    <Wrapper to={"#/" + address} {...props}>
      {name || formatAddress(address)}
    </Wrapper>
  );
}

interface Props {
  address: string;
  accent?: boolean;
}

const Wrapper = styled(Link) <{ accent?: boolean }>`
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .26rem;
  color: ${props => props.accent ? "#04ff00" : "inherit"};
  transition: .17s ease-in-out;

  svg {
    width: 1.05rem;
    height: 1.05rem;
    color: inherit;
  }

  &:hover {
    opacity: .8;
  }
`;

import { styled } from "@linaria/react";
import { HTMLProps, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@apollo/client";
import { formatAddress } from "../utils/format";
import { GetTransaction } from "../queries/base";
// @ts-expect-error
import { ARIO } from "@ar.io/sdk/web";
import { dryrun } from "@permaweb/aoconnect";
import { Message } from "../pages/interaction";
import { useGateway } from "../utils/hooks";
import { TokenLogo } from "./Page";

const ario = ARIO.mainnet();

export default function EntityLink({ address, ...props }: HTMLProps<HTMLAnchorElement> & Props) {
  const { loading, data: transaction } = useQuery(GetTransaction, {
    variables: { id: address }
  });

  const tags = useMemo(
    () => {
      if (loading || !transaction?.transactions?.edges?.[0]) return {};
      return Object.fromEntries(transaction.transactions.edges[0].node.tags.map(t => [t.name, t.value]));
    },
    [loading, transaction]
  );

  const [arnsName, setArnsName] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        setArnsName(undefined);
        const res = await ario.getPrimaryName({ address });
        setArnsName(res?.name);
      } catch {}
    })();
  }, [address]);

  const [info, setInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setInfo({});

      const res = await dryrun({
        process: address,
        tags: [{ name: "Action", value: "Info" }]
      });

      const infoRes: Message | undefined = res.Messages.find(
        (msg: Message) => !!msg.Tags.find((t) => t.name === "Name")
      );

      if (!infoRes) return;

      // @ts-expect-error
      setInfo(infoRes.Tags.map(t => [t.name, t.value]))
    })();
  }, [address]);

  const gateway = useGateway();

  return (
    <Wrapper to={"#/" + address} state={{ transaction }} {...props}>
      {info.Name || arnsName || tags.Name || formatAddress(address)}
      {(info.Logo || arnsName) && (
        <TokenLogo src={info.Logo ? `${gateway}/${info.Logo}` : "/arns.svg"} draggable={false} />
      )}
      <Tooltip>
        {address}
      </Tooltip>
    </Wrapper>
  );
}

interface Props {
  address: string;
  accent?: boolean;
}

const Tooltip = styled.span`
  position: absolute;
  background-color: #000;
  color: #fff;
  font-size: 1rem;
  z-index: 100;
  bottom: 120%;
  padding: .3rem;
  left: 50%;
  border-radius: 1px;
  white-space: nowrap;
  transform: translateX(-50%);

  &::after {
    content: " ";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -6px;
    border-width: 6px;
    border-style: solid;
    border-color: #000 transparent transparent transparent;
  }
`;

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

  &:not(:hover) ${Tooltip} {
    display: none;
  }
`;

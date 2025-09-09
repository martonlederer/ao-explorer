import { styled } from "@linaria/react";
import { HTMLProps, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@apollo/client";
import { formatAddress } from "../utils/format";
import { FullTransactionNode, GetTransaction } from "../queries/base";
// @ts-expect-error
import { ARIO } from "@ar.io/sdk/web";
import { dryrun } from "@permaweb/aoconnect";
import { Message } from "../pages/interaction";
import { useGateway } from "../utils/hooks";
import { TokenLogo } from "./Page";
import { useInView } from "react-intersection-observer";
import { CurrentTransactionContext } from "./CurrentTransactionProvider";

const ario = ARIO.mainnet();

export default function EntityLink({ address, transaction: defaultTransaction, accent, ...props }: HTMLProps<HTMLAnchorElement> & Props) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px"
  });

  const { loading, data } = useQuery(GetTransaction, {
    variables: { id: address },
    skip: !!defaultTransaction || !inView
  });
  const transaction = useMemo(
    () => defaultTransaction || data?.transactions?.edges?.[0]?.node,
    [defaultTransaction, data]
  );

  const tags = useMemo(
    () => {
      if (loading || !transaction) return {};
      return Object.fromEntries(transaction.tags.map(t => [t.name, t.value]));
    },
    [loading, transaction]
  );

  const [arnsName, setArnsName] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        setArnsName(undefined);

        if (!inView) return;
        if (defaultTransaction) {
          const type = defaultTransaction.tags.find(t => t.name === "Type")?.value;

          if (type === "Message" || type === "Module" || type === "Assignment") return;
        }

        const res = await ario.getPrimaryName({ address });
        setArnsName(res?.name);
      } catch {}
    })();
  }, [address, defaultTransaction, inView]);

  const [info, setInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setInfo({});

      if (defaultTransaction && defaultTransaction.tags.find(t => t.name === "Type")?.value !== "Process" || !inView) {
        return;
      }

      const res = await dryrun({
        process: address,
        tags: [{ name: "Action", value: "Info" }]
      });

      const infoRes: Message | undefined = res.Messages.find(
        (msg: Message) => typeof msg.Tags.find((t) => t.name === "Name")?.value !== "undefined"
      );

      if (!infoRes) return;

      setInfo(Object.fromEntries(infoRes.Tags.map(t => [t.name, t.value])))
    })();
  }, [address, defaultTransaction, inView]);

  const gateway = useGateway();
  const [, setCurrentTx] = useContext(CurrentTransactionContext);

  return (
    <Wrapper to={"#/" + address} accent={accent} ref={ref} onClick={() => setCurrentTx(transaction)} {...props}>
      {info.Logo && (
        <TokenLogo src={`${gateway}/${info.Logo}`} draggable={false} />
      )}
      {info.Name || arnsName || tags.Name || formatAddress(address)}
      {arnsName && !info.Logo && <TokenLogo src="/arns.svg" draggable={false} />}
      <Tooltip>
        {address}
      </Tooltip>
    </Wrapper>
  );
}

interface Props {
  address: string;
  transaction?: FullTransactionNode;
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

const Wrapper = styled(Link)<{ accent?: boolean }>`
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .26rem;
  color: ${props => props.accent ? "#04ff00" : "inherit"};
  width: max-content;
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

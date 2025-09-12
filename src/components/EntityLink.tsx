import { styled } from "@linaria/react";
import { HTMLProps, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@apollo/client";
import { formatAddress, getTagValue } from "../utils/format";
import { FullTransactionNode, GetTransaction } from "../queries/base";
// @ts-expect-error
import { ARIO } from "@ar.io/sdk/web";
import { dryrun } from "@permaweb/aoconnect";
import { Message } from "../pages/interaction";
import { useGateway } from "../utils/hooks";
import { TokenLogo } from "./Page";
import { useInView } from "react-intersection-observer";
import { CurrentTransactionContext } from "./CurrentTransactionProvider";
import { Tag } from "../queries/processes";
import { CheckIcon, ClipboardIcon } from "@iconicicons/react";

const ario = ARIO.mainnet();

export default function EntityLink({ address, transaction: defaultTransaction, messageTargetProcess, accent, idonly, ...props }: HTMLProps<HTMLAnchorElement> & Props) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px"
  });

  const { loading, data } = useQuery(GetTransaction, {
    variables: { id: address },
    skip: !!defaultTransaction || !inView || !!messageTargetProcess
  });

  const [fallbackTransaction, setFallbackTransaction] = useState<FullTransactionNode>();

  useEffect(() => {
    (async () => {
      // only run, if the transaction was not found on gql
      if (!!defaultTransaction || !inView || loading || data?.transactions?.edges?.[0]?.node?.id === address) return;
      const su = "https://su-router.ao-testnet.xyz";

      // for messages
      if (messageTargetProcess) {
        const res = await (
          await fetch(`${su}/${address}?process=${messageTargetProcess}`)
        ).json();
        if (res.error) return;

        res.message.block = {
          height: parseInt(getTagValue("Block-Height", res.assignment.tags as Tag[]) || "0"),
          timestamp: parseInt(getTagValue("Timestamp", res.assignment.tags as Tag[]) || "0") / 1000
        };

        setFallbackTransaction(res.message);
      } else {
        // for processes
        const res = await (
          await fetch(`${su}/${address}?limit=1`)
        ).json();
        if (res.error) return;

        const initNode = res.edges[0]?.node;
        if (!initNode) return;

        initNode.message.block = {
          height: parseInt(getTagValue("Block-Height", res.assignment.tags as Tag[]) || "0"),
          timestamp: parseInt(getTagValue("Timestamp", res.assignment.tags as Tag[]) || "0") / 1000
        };

        setFallbackTransaction(initNode.message);
      }
    })();
  }, [defaultTransaction, inView, address, loading, data, messageTargetProcess]);

  const transaction = useMemo(
    () => defaultTransaction || data?.transactions?.edges?.[0]?.node || fallbackTransaction,
    [defaultTransaction, data, fallbackTransaction]
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

        if (!inView || defaultTransaction || !!tags.Type || idonly || !!messageTargetProcess) return;

        const res = await ario.getPrimaryName({ address });
        setArnsName(res?.name);
      } catch {}
    })();
  }, [address, defaultTransaction, inView, tags, idonly, messageTargetProcess]);

  const [info, setInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setInfo({});

      if (!!messageTargetProcess || idonly || defaultTransaction && defaultTransaction.tags.find(t => t.name === "Type")?.value !== "Process" || !inView) {
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
  }, [address, defaultTransaction, inView, idonly, messageTargetProcess]);

  const gateway = useGateway();
  const [, setCurrentTx] = useContext(CurrentTransactionContext);

  const [copiedRecently, setCopiedRecently] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopiedRecently(true);
    setTimeout(() => setCopiedRecently(false), 1700);
  }

  return (
    <Wrapper>
      <LinkWrapper to={"#/" + address} ref={ref} accent={accent} {...props} onClick={() => setCurrentTx(transaction)}>
        {info.Logo && (
          <TokenLogo src={`${gateway}/${info.Logo}`} draggable={false} />
        )}
        {(idonly && formatAddress(address)) || info.Ticker || info.Name || arnsName || tags.Ticker || tags.Name || formatAddress(address)}
        {arnsName && !info.Logo && <TokenLogo src="/arns.svg" draggable={false} />}
      </LinkWrapper>
      <CopyWrapper>
        {(!copiedRecently && <Copy onClick={copy} />) || <CheckIcon />}
      </CopyWrapper>
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
  idonly?: boolean;
  messageTargetProcess?: string;
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

const CopyWrapper = styled.span`
  display: flex;

  svg {
    width: 1rem;
    height: 1rem;
    color: inherit;
  }
`;

const Copy = styled(ClipboardIcon)`
  cursor: pointer;
  transition: all .17s ease-in-out;

  &:hover {
    opacity: .8;
  }

  &:active {
    transform: scale(.9);
  }
`;

const Wrapper = styled.div`
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .4rem;
  width: max-content;

  svg {
    width: 1.05rem;
    height: 1.05rem;
    color: inherit;
  }

  &:not(:hover) ${Tooltip} {
    display: none;
  }

  &:not(:hover) ${CopyWrapper} {
    opacity: 0;
  }
`;

const LinkWrapper = styled(Link)<{ accent?: boolean }>`
  display: flex;
  align-items: center;
  color: ${props => props.accent ? "#04ff00" : "inherit"};
  gap: .26rem;
  transition: .17s ease-in-out;

  &:hover {
    opacity: .8;
  }
`;

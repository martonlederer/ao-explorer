import { styled } from "@linaria/react";
import { HTMLProps, useContext, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@apollo/client";
import { formatAddress, getTagValue, tagsToRecord } from "../utils/format";
import { FullTransactionNode, GetTransaction } from "../queries/base";
import { TokenLogo } from "./Page";
import { useInView } from "react-intersection-observer";
import { CurrentTransactionContext } from "./CurrentTransactionProvider";
import { CheckIcon, ClipboardIcon } from "@iconicicons/react";
import usePrimaryName from "../hooks/usePrimaryName";
import useInfo from "../hooks/useInfo";
import useGateway from "../hooks/useGateway";

export default function EntityLink({ address, transaction: defaultTransaction, accent, idonly, ...props }: HTMLProps<HTMLAnchorElement> & Props) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px"
  });

  const { loading, data } = useQuery(GetTransaction, {
    variables: { id: address },
    skip: !!defaultTransaction || !inView
  });
  const transaction = useMemo(
    () => {
      if (loading) return undefined;
      return defaultTransaction || data?.transactions?.edges?.[0]?.node
    },
    [defaultTransaction, data, loading]
  );

  const tags = useMemo(
    () => tagsToRecord(transaction?.tags),
    [transaction]
  );

  const { data: arnsName, isEnabled: isArnsEnabled } = usePrimaryName(
    address,
    inView && !defaultTransaction && !tags.Type && !idonly
  );

  const { data: infoMessage, isEnabled: isInfoEnabled } = useInfo(
    address,
    !idonly && inView && (!defaultTransaction || getTagValue("Type", defaultTransaction.tags) !== "Process")
  );
  const info = useMemo(
    () => isInfoEnabled && infoMessage?.Tags || {},
    [infoMessage, isInfoEnabled]
  );

  const gateway = useGateway();
  const [, setCurrentTx] = useContext(CurrentTransactionContext);

  const [copiedRecently, setCopiedRecently] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopiedRecently(true);
    setTimeout(() => setCopiedRecently(false), 1700);
  }

  const display = useMemo(
    () => {
      const shortenAddress = formatAddress(address);

      if (idonly) return shortenAddress;
      if (info.Ticker || info.Name) {
        return info.Ticker || info.Name;
      }
      if (isArnsEnabled && arnsName) return arnsName;

      return tags.Ticker || tags.Name || shortenAddress;
    },
    [address, idonly, info, isArnsEnabled, arnsName, tags]
  );

  return (
    <Wrapper>
      <LinkWrapper to={"#/" + address} ref={ref} accent={accent} {...props} onClick={() => setCurrentTx(transaction)}>
        {info.Logo && (
          <TokenLogo src={`${gateway}/${info.Logo}`} draggable={false} />
        )}
        {display}
        {arnsName && isArnsEnabled && !info.Logo && (
          <TokenLogo src="/arns.svg" draggable={false} />
        )}
      </LinkWrapper>
      <Tooltip>
        {address}
      </Tooltip>
      <CopyWrapper>
        {(!copiedRecently && <Copy onClick={copy} />) || <CheckIcon />}
      </CopyWrapper>
    </Wrapper>
  );
}

interface Props {
  address: string;
  transaction?: FullTransactionNode;
  accent?: boolean;
  idonly?: boolean;
}

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

const Wrapper = styled.div<{ accent?: boolean }>`
  position: relative;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  color: ${props => props.accent ? "#04ff00" : "inherit"};
  width: max-content;
  transition: .17s ease-in-out;

  svg {
    width: 1.05rem;
    height: 1.05rem;
    color: ${props => props.accent ? "#04ff00" : "inherit"};
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

  &:not(:hover) + ${Tooltip} {
    display: none;
  }
`;

import { Copy, ProcessID, ProcessName, ProcessTitle, Space, Tables, TokenLogo, Wrapper } from "../components/Page";
import { useEffect, useState } from "react";
import { useGateway } from "../utils/hooks";
import { Quantity } from "ao-tokens-lite";
import Table from "../components/Table";
// @ts-expect-error
import { ARIO } from "@ar.io/sdk/web";
import { dryrun } from "@permaweb/aoconnect";
import { Tag } from "../queries/processes";
import { styled } from "@linaria/react";
import { InteractionsMenu, InteractionsMenuItem, InteractionsWrapper } from "./process";

const ario = ARIO.mainnet();

export default function Wallet({ address }: Props) {
  const gateway = useGateway();
  const [arBalance, setArBalance] = useState("0");

  useEffect(() => {
    (async () => {
      setArBalance("0");

      const res = await (
        await fetch(`${gateway}/wallet/${address}/balance`)
      ).text();
      const balanceQty = new Quantity(res || "0", 12n);

      setArBalance(balanceQty.toLocaleString(undefined, {
        maximumFractionDigits: Quantity.lt(balanceQty, new Quantity(1n, 0n)) ? 12 : 4
      }));
    })();
  }, [address, gateway]);

  const [aoBalance, setAoBalance] = useState("0");

  useEffect(() => {
    (async () => {
      setAoBalance("0");

      const res = await dryrun({
        process: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc",
        Owner: address,
        tags: [
          { name: "Action", value: "Balance" },
          { name: "Recipient", value: address }
        ]
      });
      if (!res.Messages[0]) return;
      const balanceQty = new Quantity(res.Messages[0].Tags.find((t: Tag) => t.name === "Balance")?.value || "0", 12n);

      setAoBalance(balanceQty.toLocaleString(undefined, {
        maximumFractionDigits: Quantity.lt(balanceQty, new Quantity(1n, 0n)) ? 12 : 4
      }));
    })();
  }, [address]);

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

  const [interactionsMode, setInteractionsMode] = useState<"incoming" | "outgoing" | "spawns" | "transfers" | "balances">("incoming");

  return (
    <Wrapper>
      <ProcessTitle>
        Wallet
        {arnsName && (
          <ProcessName>
            {arnsName}
            <TokenLogo src="/arns.svg" draggable={false} />
          </ProcessName>
        )}
      </ProcessTitle>
      <ProcessID>
        {address}
        <Copy
          onClick={() => navigator.clipboard.writeText(address)}
        />
      </ProcessID>
      <Tables>
        <Table>
          <tr></tr>
          <tr>
            <td>Arweave Balance</td>
            <td>
              <Balance>
                {arBalance}
                {" AR"}
                <TokenLogo src="/ar.png" draggable={false} />
              </Balance>
            </td>
          </tr>
          <tr>
            <td>AO Balance</td>
            <td>
              <Balance>
                {aoBalance}
                {" AO"}
                <TokenLogo src={`${gateway}/UkS-mdoiG8hcAClhKK8ch4ZhEzla0mCPDOix9hpdSFE}`} draggable={false} />
              </Balance>
            </td>
          </tr>
        </Table>
      </Tables>
      <Space y={1.5} />
      <InteractionsMenu>
        <InteractionsWrapper>
          <InteractionsMenuItem
            active={interactionsMode === "incoming"}
            onClick={() => setInteractionsMode("incoming")}
          >
            Incoming
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={interactionsMode === "outgoing"}
            onClick={() => setInteractionsMode("outgoing")}
          >
            Outgoing
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={interactionsMode === "spawns"}
            onClick={() => setInteractionsMode("spawns")}
          >
            Processes
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={interactionsMode === "transfers"}
            onClick={() => setInteractionsMode("transfers")}
          >
            Transfers
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={interactionsMode === "balances"}
            onClick={() => setInteractionsMode("balances")}
          >
            Balances
          </InteractionsMenuItem>
        </InteractionsWrapper>
      </InteractionsMenu>
      <Space />
    </Wrapper>
  );
}

const Balance = styled.div`
  display: flex;
  align-items: center;
  gap: .35rem;
`;

interface Props {
  address: string;
}

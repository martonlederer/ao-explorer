import arGql, { TransactionEdge } from "arweave-graphql"
import { useEffect, useMemo, useState } from "react";
import { formatAddress } from "../utils/format";
import { styled } from "@linaria/react";
import Table from "../components/Table";

export default function Process({ id }: Props) {
  const [initTx, setInitTx] = useState<TransactionEdge | "loading">("loading");

  useEffect(() => {
    (async () => {
      setInitTx("loading");
      const res = await arGql("https://arweave.net/graphql").getTransactions({
        ids: [id]
      });

      setInitTx(res.transactions.edges[0] as TransactionEdge);
    })();
  }, [id]);

  const tags = useMemo(() => {
    const tagRecord: { [name: string]: string } = {};

    if (!initTx || initTx == "loading")
      return tagRecord;

    for (const tag of initTx.node.tags) {
      tagRecord[tag.name] = tag.value
    }

    return tagRecord;
  }, [initTx]);

  const [schedulerURL, setSchedulerURL] = useState<string>();

  useEffect(() => {
    (async () => {
      if (!initTx || initTx == "loading") return;

      const res = await arGql("https://arweave.net/graphql").getTransactions({
        owners: [tags.Scheduler],
        tags: [
          { name: "Data-Protocol", values: ["ao"] },
          { name: "Type", values: ["Scheduler-Location"] },
        ]
      });

      const url = res?.transactions?.edges?.[0]?.node?.tags?.find((t) => t.name === "Url")?.value;
      if (!url) return;

      setSchedulerURL(new URL(url).host);
    })();
  }, [tags, initTx]);

  if (!initTx || initTx == "loading") {
    return (
      <Wrapper>
        <NotFound>
          {(!initTx && "Could not find process") || "Loading..."}
        </NotFound>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <ProcessTitle>
        Process
        {tags.Name && (
          <ProcessName>
            {tags.Name}
          </ProcessName>
        )}
      </ProcessTitle>
      <ProcessID>
        {id}
      </ProcessID>
      <Tables>
        <Table>
          <tr></tr>
          <tr>
            <td>Owner</td>
            <td>{formatAddress(initTx.node.owner.address)}</td>
          </tr>
          <tr>
            <td>Variant</td>
            <td>{tags.Variant}</td>
          </tr>
          <tr>
            <td>Module</td>
            <td>{formatAddress(tags["Module"])}</td>
          </tr>
          <tr>
            <td>Scheduler</td>
            <td>
              {schedulerURL}
              {" "}
              ({formatAddress(tags.Scheduler, 7)})
            </td>
          </tr>
        </Table>
      </Tables>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  padding: 2rem 10vw;
`;

const ProcessTitle = styled.h1`
  display: flex;
  align-items: baseline;
  gap: .35rem;
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0 0 .5rem;
  color: #fff;
`;

const NotFound = styled.p`
  text-align: center;
  color: #fff;
  margin: 2rem;
`;

const ProcessName = styled.span`
  font-size: 1em;
  color: rgba(255, 255, 255, .7);
`;

const ProcessID = styled.h2`
  font-size: 1rem;
  color: rgba(255, 255, 255, .85);
  font-weight: 400;
  margin: 0 0 2.7rem;
`;

const Tables = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
`;

interface Props {
  id: string;
}

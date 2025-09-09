import { useContext, useEffect, useMemo, useState } from "react";
import { CurrentTransactionContext } from "../components/CurrentTransactionProvider";
import { useQuery } from "@apollo/client";
import { GetTransaction } from "../queries/base";
import Process from "./process";
import Interaction from "./interaction";
import { NotFound, Wrapper } from "../components/Page";
import Transaction from "./transaction";

export default function Entity({ id }: Props) {
  const [transaction, setTransaction] = useContext(CurrentTransactionContext);
  const needsFetching = useMemo(() => !transaction || transaction.id !== id, [transaction, id]);
  const { data: queriedTx, loading } = useQuery(GetTransaction, {
    variables: { id },
    skip: !needsFetching
  });

  const [notFound, setNotFound] = useState(false);

  useEffect(() => setNotFound(false), [id]);

  useEffect(() => {
    if (!needsFetching || loading || !queriedTx) return;
    setTransaction(queriedTx.transactions.edges[0]?.node);
    setNotFound(typeof queriedTx.transactions.edges[0]?.node === "undefined");
  }, [needsFetching, queriedTx, loading]);

  const type = useMemo(
    () => transaction?.tags?.find((t) => t.name === "Type")?.value,
    [transaction]
  );

  if (!transaction) {
    return (
      <Wrapper>
        <NotFound>
          {notFound ? "Transaction not found." : "Loading..."}
        </NotFound>
      </Wrapper>
    );
  } else if (type === "Process") return <Process initTx={transaction} />;
  else if (type === "Message") return <Interaction message={transaction} />;
  else return <Transaction transaction={transaction} />;
}

interface Props {
  id: string;
}

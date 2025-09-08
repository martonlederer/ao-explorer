import { useContext, useEffect, useMemo } from "react";
import { CurrentTransactionContext } from "../components/CurrentTransactionProvider";
import { useQuery } from "@apollo/client";
import { GetTransaction } from "../queries/base";
import Process from "./process";
import Interaction from "./interaction";

export default function Entity({ id }: Props) {
  const [transaction, setTransaction] = useContext(CurrentTransactionContext);
  const needsFetching = useMemo(() => !transaction || transaction.id !== id, [transaction, id]);
  const { data: queriedTx, loading } = useQuery(GetTransaction, {
    variables: { id },
    skip: !needsFetching
  });

  useEffect(() => {
    if (!needsFetching || loading || !queriedTx) return;
    setTransaction(queriedTx.transactions.edges[0]?.node);
  }, [needsFetching, queriedTx, loading]);

  const type = useMemo(
    () => transaction?.tags?.find((t) => t.name === "Type")?.value,
    [transaction]
  );

  if (!type || !transaction) return <>Loading...</>;
  else if (type === "Process") return <Process initTx={transaction} />;
  else if (type === "Message") return <Interaction message={transaction} />;
  else return <>Not yet supported...</>;
}

interface Props {
  id: string;
}

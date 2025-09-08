import { Dispatch, PropsWithChildren, SetStateAction, createContext, useState } from "react";
import { TransactionNode } from "../queries/messages";

export const CurrentTransactionContext = createContext<
  [TransactionNode | undefined, Dispatch<SetStateAction<TransactionNode | undefined>>]
>([undefined, () => {}]);

export function CurrentTransactionProvider({ children }: PropsWithChildren<{}>) {
  const [state, setState] = useState<TransactionNode | undefined>();

  return (
    <CurrentTransactionContext.Provider value={[state, setState]}>
      {children}
    </CurrentTransactionContext.Provider>
  );
}

import { Dispatch, PropsWithChildren, SetStateAction, createContext, useState } from "react";
import { FullTransactionNode } from "../queries/base";

export const CurrentTransactionContext = createContext<
  [FullTransactionNode | undefined, Dispatch<SetStateAction<FullTransactionNode | undefined>>]
>([undefined, () => {}]);

export function CurrentTransactionProvider({ children }: PropsWithChildren<{}>) {
  const [state, setState] = useState<FullTransactionNode | undefined>();

  return (
    <CurrentTransactionContext.Provider value={[state, setState]}>
      {children}
    </CurrentTransactionContext.Provider>
  );
}

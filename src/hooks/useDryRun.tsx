import { createContext, PropsWithChildren, useCallback, useContext } from "react";
import { DryRunFIFO } from "../ao/DryRunFIFO";
import { MessageInput } from "@permaweb/aoconnect/dist/lib/dryrun";

const instance = new DryRunFIFO([
  "https://cu1.ao-testnet.xyz",
  "https://cu24.ao-testnet.xyz",
  "https://cu-af.dataos.so",
  "https://cu.perplex.finance",
  "https://cu.arweave.asia",
  "https://cu.ardrive.io"
]);
const DryRunContext = createContext(instance);

export const DryRunProvider = ({ children }: PropsWithChildren<{}>) => (
  <DryRunContext.Provider value={instance}>
    {children}
  </DryRunContext.Provider>
);

export function useDryRun() {
  const instance = useContext(DryRunContext);

  return useCallback(
    (msg: MessageInput) => instance.put(msg),
    [instance]
  );
}

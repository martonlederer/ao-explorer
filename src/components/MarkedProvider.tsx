import { Dispatch, PropsWithChildren, SetStateAction, createContext, useEffect, useState } from "react";

export const MarkedContext = createContext<
  [string[], Dispatch<SetStateAction<string[]>>]
>([[], () => {}]);

export function MarkedProvider({ children }: PropsWithChildren<{}>) {
  const CACHE_KEY = "marked-processes";
  const [state, setState] = useState<string[]>([]);
  const [loadedCache, setLoadedCache] = useState(false);

  // load
  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    setState(cached);
    setLoadedCache(true);
  }, []);

  // save
  useEffect(() => {
    if (!loadedCache) return;
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  }, [state, loadedCache]);

  return (
    <MarkedContext.Provider value={[state, setState]}>
      {children}
    </MarkedContext.Provider>
  );
}

import { useEffect, useState } from "react";

/**
 * Use the gateway the explorer is requested from.
 * Use g8way.io locally
 */
export function useGateway() {
  const DEFAULT_GATEWAY = "https://g8way.io"
  const [gateway, setGateway] = useState(DEFAULT_GATEWAY);

  useEffect(() => {
    const listener = () => {
      let server = DEFAULT_GATEWAY;

      if (!window.location.host.startsWith("localhost")) {
        const host = window.location.host.split(".");
        server = window.location.protocol + "//" + host.slice(1).join(".");
      }
      if (server === gateway) return;

      setGateway(server);
    };

    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);

  return gateway;
}

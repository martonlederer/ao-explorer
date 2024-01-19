import { useEffect, useState } from "react";

const currentLocation = () => {
  return window.location.hash.replace(/^#/, "") || "/";
};

const navigate = (to: string) => (window.location.hash = to);

const useHashLocation = (): [string, (to: string) => any] => {
  const [loc, setLoc] = useState(currentLocation());

  useEffect(() => {
    const handler = () => setLoc(currentLocation());

    window.addEventListener("hashchange", handler);

    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return [loc, navigate];
};

export default useHashLocation;

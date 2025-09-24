import { useQuery } from "@tanstack/react-query";
// @ts-expect-error
import { ARIO } from "@ar.io/sdk/web";

const ario = ARIO.mainnet();

export default function usePrimaryName(address?: string, enabled = true) {
  return useQuery<string | undefined>({
    queryKey: ["primary-name", address],
    queryFn: async () => {
      const res = await ario.getPrimaryName({ address });

      return res?.name;
    },
    enabled: !!address && enabled
  });
}

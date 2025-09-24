import { dryrun } from "@permaweb/aoconnect";
import { useQuery } from "@tanstack/react-query";
import { tagsToRecord } from "../utils/format";
import { Message, ProcessedMessage } from "../ao/types";

export default function useInfo(process?: string, enabled = true) {
  return useQuery<ProcessedMessage | undefined>({
    queryKey: ["info", process],
    queryFn: async () => {
      const res = await dryrun({
        process: process!,
        tags: [{ name: "Action", value: "Info" }]
      });

      for (const msg of res.Messages as Message[]) {
        const tags = tagsToRecord(msg.Tags);

        if (tags.Name || tags.Ticker) {
          return {
            ...msg,
            Tags: tags
          };
        }
      }

      return undefined;
    },
    enabled: !!process && enabled
  });
}

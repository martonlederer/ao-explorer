import { Tag } from "../queries/processes";

export function formatAddress(address: string, count = 11) {
  return (
    address.substring(0, count) +
    "..." +
    address.substring(address.length - count, address.length)
  );
}

export const isAddress = (addr: string) => /[a-z0-9_-]{43}/i.test(addr);

export const getTagValue = (tagName: string, tags: Tag[]) => tags.find((t) => t.name === tagName)?.value;

export function formatJSONOrString(maybeJson: string = "{}") {
  try {
    const parsed = JSON.parse(maybeJson);
    maybeJson = JSON.stringify(parsed, null, 2);
  } catch {}

  return maybeJson;
}

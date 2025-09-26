import { Quantity } from "ao-tokens-lite";
import { Tag } from "../ao/types";

export function formatAddress(address?: string, count = 8) {
  if (!address) return "";
  return (
    address.substring(0, count) +
    "..." +
    address.substring(address.length - count, address.length)
  );
}

export const isAddress = (addr: string) => /^[a-z0-9_-]{43}$/i.test(addr) && addr.length === 43;

export const getTagValue = (tagName: string, tags: Tag[]) => tags.find((t) => t.name === tagName)?.value;

export function getTransactionType(tags: Tag[]) {
  const typeValue = getTagValue("Type", tags);

  if (typeValue) return typeValue;
  if (getTagValue("Bundle-Format", tags)) return "Bundle";
  return "Transaction";
}

export function formatJSONOrString(maybeJson: string = "{}") {
  try {
    const parsed = JSON.parse(maybeJson);
    maybeJson = JSON.stringify(parsed, null, 2);
  } catch {}

  return maybeJson;
}

export function formatQuantity(val: string | number) {
  if (typeof val === "string") {
    val = parseFloat(val);
  }

  let maximumFractionDigits = 2;
  if (val < 999) {
    maximumFractionDigits = val < 1 ? 12 : 4;
  }

  return val.toLocaleString(undefined, { maximumFractionDigits });
}

export function formatTokenQuantity(val: Quantity) {
  let maximumFractionDigits = 2;

  if (Quantity.lt(val, new Quantity(999n, 0n))) {
    maximumFractionDigits = Quantity.lt(val, new Quantity(1n, 0n)) ? 12 : 4;
  }

  // @ts-expect-error
  return val.toLocaleString(undefined, { maximumFractionDigits });
}

export function tagsToRecord(tags?: Tag[]): Record<string, string> {
  if (!tags) return {};
  return Object.fromEntries(tags.map(t => [t.name, t.value]));
}

export interface Tag {
  name: string;
  value: string;
}

export interface Message {
  Anchor: string;
  Tags: Tag[];
  Target: string;
  Data: string;
}

export interface ProcessedMessage extends Omit<Message, "Tags"> {
  Tags: Record<string, string>;
}

import {
  DryRun,
  DryRunResult,
  MessageInput,
} from "@permaweb/aoconnect/dist/lib/dryrun";
import { connect } from "@permaweb/aoconnect";

interface DryRunQueueItem {
  msg: MessageInput;
  resolve: (result: DryRunResult) => void;
  reject: (reason?: any) => void;
}

export class DryRunFIFO {
  #queue: DryRunQueueItem[];
  #running: boolean;
  #availableDryRuns: DryRunList;

  constructor(CUs: string[], delay = 500) {
    this.#queue = [];
    this.#running = false;
    this.#availableDryRuns = new DryRunList(
      // @ts-expect-error
      CUs.map((CU_URL) => connect({ MODE: "legacy", CU_URL }).dryrun),
      delay,
    );
  }

  put(msg: MessageInput) {
    return new Promise<DryRunResult>((resolve, reject) => {
      this.#queue.push({ msg, resolve, reject });
      this.#run();
    });
  }

  async #run() {
    if (this.#running) return;
    this.#running = true;

    while (this.#queue.length > 0) {
      const dryrun = await this.#availableDryRuns.waitForOne();
      const { msg, resolve, reject } = this.#queue.shift()!;

      dryrun(msg)
        .then(resolve)
        .catch(reject)
        .finally(() => this.#availableDryRuns.push(dryrun));
    }

    this.#running = false;
  }
}

class DryRunList {
  #list: DryRun[];
  #delay: number;
  #resolves: Array<(val: DryRun) => void>;

  constructor(list: DryRun[] = [], delay: number) {
    this.#list = list;
    this.#delay = delay;
    this.#resolves = [];
  }

  push(item: DryRun) {
    setTimeout(() => {
      const nextRequest = this.#resolves.shift();
      if (nextRequest) nextRequest(item);
      else this.#list.push(item);
    }, this.#delay);
  }

  async waitForOne() {
    const next = this.#list.shift();
    if (next) return next;

    return new Promise<DryRun>((resolve) => {
      this.#resolves.push(resolve);
    });
  }
}

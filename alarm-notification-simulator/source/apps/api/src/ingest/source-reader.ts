/**
 * The ingestion seam for pull-based sources.
 *
 * Some customer systems can POST a webhook to us; others only write a row to
 * their own database and expect a program to come and look. Both feed the same
 * alarm pipeline - the difference is confined to this interface.
 *
 * Phase A ships an HTTP implementation that reads the simulated operations
 * server. A production deployment adds a second implementation issuing a
 * cursor-based SELECT against the customer's database. Nothing downstream
 * changes.
 */
export type SourceEventReader = {
  readonly name: string;
  /**
   * Returns rows that have not been processed yet.
   *
   * Implementations must be safe to call repeatedly: the alarm pipeline's
   * deduplication is what guarantees no duplicate notification, so returning a
   * row twice is acceptable and losing one is not.
   */
  fetchPending(): Promise<unknown[]>;
};

export class HttpSourceEventReader implements SourceEventReader {
  readonly name = "http";

  constructor(private readonly url: string) {}

  async fetchPending(): Promise<unknown[]> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Source reader got HTTP ${response.status} from ${this.url}`);
    }

    const body = (await response.json()) as { data?: { items?: unknown[] } };
    return body.data?.items ?? [];
  }
}

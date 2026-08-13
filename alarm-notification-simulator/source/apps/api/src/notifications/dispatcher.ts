/**
 * Seam between alarm ingestion and push delivery.
 *
 * The webhook route depends only on this interface, so the ingest pipeline has
 * no knowledge of Expo, FCM, WebSockets or any other transport.
 */
export type PushDispatcher = {
  sendForAlarm(alarmId: string, requestId: string): Promise<void>;
};

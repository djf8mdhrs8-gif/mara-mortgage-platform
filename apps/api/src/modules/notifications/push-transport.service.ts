import { Injectable, Logger } from '@nestjs/common';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

export interface PushOutcome {
  token: string;
  ok: boolean;
  detail: string;
}

/**
 * Thin wrapper around Expo's push API — the only piece that talks to the
 * outside world, so tests can fake it and the service stays pure.
 */
@Injectable()
export class PushTransport {
  private readonly logger = new Logger(PushTransport.name);
  private readonly expo = new Expo();

  async send(messages: ExpoPushMessage[]): Promise<PushOutcome[]> {
    const outcomes: PushOutcome[] = [];
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, index) => {
          const token = String(chunk[index]?.to ?? 'unknown');
          if (ticket.status === 'ok') {
            outcomes.push({ token, ok: true, detail: 'ok' });
          } else {
            outcomes.push({
              token,
              ok: false,
              detail: ticket.details?.error ?? ticket.message ?? 'unknown error',
            });
          }
        });
      } catch (error) {
        this.logger.warn({ err: error }, 'expo push request failed');
        for (const message of chunk) {
          outcomes.push({
            token: String(message.to),
            ok: false,
            detail: error instanceof Error ? error.message : 'transport error',
          });
        }
      }
    }
    return outcomes;
  }
}

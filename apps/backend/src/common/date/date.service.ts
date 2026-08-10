import { Injectable } from '@nestjs/common';

const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

@Injectable()
export class DateService {
  getCurrentDateString(reference: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ARGENTINA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(reference);
  }

  addDays(dateString: string, days: number): string {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
}

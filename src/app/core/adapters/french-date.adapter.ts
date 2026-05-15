import { inject, Injectable, LOCALE_ID } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class FrenchDateAdapter extends NativeDateAdapter {
  constructor() {
    super(inject(LOCALE_ID));
  }

  override parse(value: string): Date | null {
    if (typeof value === 'string') {
      if (!value.trim()) return null;

      const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (match) {
        const [, day, month, year] = match.map(Number);
        const date = new Date(year, month - 1, day);
        // Reject JS date overflow (e.g. month 13 silently wraps to next year)
        if (
          date.getFullYear() !== year ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day
        ) {
          return new Date(NaN);
        }
        return date;
      }
      // Invalid format — triggers matDatepickerParse error on the control
      return new Date(NaN);
    }
    return super.parse(value);
  }
}

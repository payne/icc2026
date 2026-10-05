import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Session } from '../core/data.service';

/** Time and room line for a session; Sessionize times are venue-local, so no timezone conversion. */
@Component({
  selector: 'app-session-time',
  imports: [DatePipe],
  template: `
    @if (session().startsAt) {
      <p class="when">
        {{ session().startsAt | date: 'EEE h:mm a' }}
        @if (session().endsAt) {
          – {{ session().endsAt | date: 'h:mm a' }}
        }
        @if (session().room) {
          · {{ session().room }}
        }
      </p>
    }
  `,
})
export class SessionTime {
  readonly session = input.required<Session>();
}

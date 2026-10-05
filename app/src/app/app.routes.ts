import { Routes } from '@angular/router';
import { About } from './pages/about';
import { SessionDetail } from './pages/session-detail';
import { Sessions } from './pages/sessions';
import { SpeakerDetail } from './pages/speaker-detail';
import { Speakers } from './pages/speakers';
import { Videos } from './pages/videos';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sessions' },
  { path: 'sessions', component: Sessions, title: 'Sessions · Iowa Code Camp 2026' },
  { path: 'sessions/:id', component: SessionDetail, title: 'Session · Iowa Code Camp 2026' },
  { path: 'speakers', component: Speakers, title: 'Speakers · Iowa Code Camp 2026' },
  { path: 'speakers/:id', component: SpeakerDetail, title: 'Speaker · Iowa Code Camp 2026' },
  { path: 'videos', component: Videos, title: 'Videos · Iowa Code Camp 2026' },
  { path: 'about', component: About, title: 'About · Iowa Code Camp 2026' },
  { path: '**', redirectTo: 'sessions' },
];

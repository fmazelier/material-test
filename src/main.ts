import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app.component';
import { appConfig } from './app/app.config';
import { renderBootError } from './boot-error';

bootstrapApplication(App, appConfig).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[Bootstrap] Application failed to start:', err);
  renderBootError(err);
});

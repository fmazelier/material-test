import { bootstrapApplicationWithErrorHandling } from 'devlab-ng-kit/bootstrap';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplicationWithErrorHandling(AppComponent, appConfig);

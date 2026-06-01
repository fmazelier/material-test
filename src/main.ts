import { bootstrapApplicationWithErrorHandling } from '@mazelab/ng-kit/bootstrap';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplicationWithErrorHandling(AppComponent, appConfig);

import { HttpContextToken } from '@angular/common/http';

export const SKIP_GLOBAL_ERROR_HANDLER = new HttpContextToken<boolean>(() => false);
export const IGNORED_ERROR_STATUSES = new HttpContextToken<number[]>(() => []);

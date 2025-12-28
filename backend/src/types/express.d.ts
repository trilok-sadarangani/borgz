import type { Logger } from '../utils/logger';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    log?: Logger;
  }
}



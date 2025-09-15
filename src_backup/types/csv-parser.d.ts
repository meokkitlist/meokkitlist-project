// src/types/csv-parser.d.ts
declare module 'csv-parser' {
  import { Transform } from 'stream';
  function csvParser(options?: any): Transform;
  export = csvParser;
}

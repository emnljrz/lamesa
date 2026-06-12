/**
 * @lamesa/csv-parser — tokenizer.ts
 *
 * Single-pass O(n) streaming character tokenizer for CSV strings.
 * Safely processes escaped interior quotation markers ("") and fields 
 * containing active line breaks or delimiter punctuation.
 */

/**
 * Tokenizes a raw CSV text string into a two-dimensional matrix array of strings.
 * @param csvString - The raw, incoming CSV data stream.
 * @param delimiter - The active structural value boundary marker.
 * @returns A 2D array representing raw matrix row and column tokens.
 */
export function tokenizeCsv(csvString: string, delimiter: string = ','): string[][] {
  const matrix: string[][] = [];
  let currentRecord: string[] = [];
  let currentToken = '';
  let insideQuotes = false;

  const length = csvString.length;

  for (let i = 0; i < length; i++) {
    const char = csvString[i];
    const nextChar = csvString[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        // Handle escaped inner quotes represented by pairs ("")
        if (nextChar === '"') {
          currentToken += '"';
          i++; // Skip past the second quote character block
        } else {
          // Found a terminating boundary quote marker
          insideQuotes = false;
        }
      } else {
        // Collect raw characters safely while encapsulated within a string field
        currentToken += char;
      }
    } else {
      if (char === '"') {
        // Found a starting encapsulation quote marker
        insideQuotes = true;
      } else if (char === delimiter) {
        // Encountered a value separator cell endpoint
        currentRecord.push(currentToken);
        currentToken = '';
      } else if (char === '\r' || char === '\n') {
        // Encountered an explicit row line-break character
        currentRecord.push(currentToken);
        currentToken = '';

        // Only commit rows that contain structural values
        if (currentRecord.length > 0 && (currentRecord.length > 1 || currentRecord[0] !== '')) {
          matrix.push(currentRecord);
        }
        currentRecord = [];

        // Smoothly advance the structural scanner window forward if encountering CRLF (\r\n) lines
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        // Build out ordinary text streams character-by-character
        currentToken += char;
      }
    }
  }

  // Catch trailing field values if a file terminates completely without a final line break token
  if (currentToken !== '' || currentRecord.length > 0) {
    currentRecord.push(currentToken);
    matrix.push(currentRecord);
  }

  return matrix;
}
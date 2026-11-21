import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedDataset, RawRow } from '../types/eda';

const MAX_FILE_SIZE_BYTES = 35 * 1024 * 1024; // 35 MB

export interface FileParseResult {
  dataset: ParsedDataset;
  excelWorkbook?: XLSX.WorkBook;
}

export function decodeBufferWithEncoding(buffer: ArrayBuffer): {
  text: string;
  encoding: string;
} {
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    let text = utf8Decoder.decode(buffer);
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }
    return { text, encoding: 'UTF-8' };
  } catch {
    // Fallback a Latin-1 / Windows-1252 para conservar tildes y ñ en archivos españoles antiguos
    const latinDecoder = new TextDecoder('windows-1252');
    const text = latinDecoder.decode(buffer);
    return { text, encoding: 'Latin-1 (ISO-8859-1)' };
  }
}

function detectBestDelimiter(sampleText: string): string | undefined {
  const candidates = [',', ';', '\t', '|'];
  const lines = sampleText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 15);

  if (lines.length === 0) return undefined;

  let bestDelim: string | undefined;
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = lines.map((line) => {
      let inQuotes = false;
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === delim && !inQuotes) count++;
      }
      return count;
    });

    const first = counts[0];
    if (first === 0) continue;

    const consistent = counts.filter((c) => c === first).length;
    const score = consistent * 100 + first;
    if (consistent >= Math.max(1, Math.floor(lines.length * 0.7)) && score > bestScore) {
      bestScore = score;
      bestDelim = delim;
    }
  }

  return bestDelim;
}

function formatExcelCellValue(val: unknown): unknown {
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return val;
}

export function extractExcelSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  fileName: string,
  fileSizeBytes: number
): ParsedDataset {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`No se encontró la hoja "${sheetName}" dentro del archivo Excel.`);
  }

  const rawRows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: '',
    raw: true,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error(`La hoja "${sheetName}" está vacía o no contiene filas de datos.`);
  }

  const columnSet = new Set<string>();
  for (const row of rawRows) {
    for (const key of Object.keys(row)) {
      columnSet.add(key);
    }
  }
  const columns = Array.from(columnSet).filter((c) => c.trim() !== '');
  if (columns.length === 0) {
    throw new Error('No se detectaron encabezados de columnas válidos en la hoja seleccionada.');
  }

  const rows: RawRow[] = rawRows.map((row) => {
    const normalized: RawRow = {};
    for (const col of columns) {
      normalized[col] = formatExcelCellValue(row[col]);
    }
    return normalized;
  });

  return {
    fileName,
    fileSizeBytes,
    format: 'Excel',
    encoding: 'Binario Excel',
    sheetNames: workbook.SheetNames,
    activeSheet: sheetName,
    columns,
    rows,
  };
}

function normalizeJsonToRows(parsed: unknown): RawRow[] {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new Error('El arreglo JSON está vacío.');
    }
    if (typeof parsed[0] === 'object' && parsed[0] !== null && !Array.isArray(parsed[0])) {
      return parsed as RawRow[];
    }
    if (Array.isArray(parsed[0]) && parsed.length > 1) {
      const headers = (parsed[0] as unknown[]).map((h, idx) =>
        String(h ?? `Columna_${idx + 1}`).trim() || `Columna_${idx + 1}`
      );
      return (parsed.slice(1) as unknown[][]).map((arr) => {
        const obj: RawRow = {};
        headers.forEach((h, idx) => {
          obj[h] = arr[idx] ?? '';
        });
        return obj;
      });
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (Array.isArray(record[key]) && (record[key] as unknown[]).length > 0) {
        return normalizeJsonToRows(record[key]);
      }
    }
  }

  throw new Error(
    'El archivo JSON debe contener una lista de objetos (por ejemplo: [{"columna": "valor"}, ...]).'
  );
}

export async function parseDataFile(file: File): Promise<FileParseResult> {
  if (file.size === 0) {
    throw new Error('El archivo está vacío (0 bytes). Selecciona un archivo con datos.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB y supera el límite recomendado de 35 MB para procesamiento fluido en el navegador.`
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const buffer = await file.arrayBuffer();

  if (ext === 'xlsx' || ext === 'xls') {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    } catch {
      throw new Error('No se pudo leer el archivo Excel. Verifica que no esté dañado o protegido con contraseña.');
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('El archivo Excel no contiene ninguna hoja.');
    }

    const firstSheet = workbook.SheetNames[0];
    const dataset = extractExcelSheet(workbook, firstSheet, file.name, file.size);
    return { dataset, excelWorkbook: workbook };
  }

  if (ext === 'csv' || ext === 'txt') {
    const { text, encoding } = decodeBufferWithEncoding(buffer);
    if (text.trim().length === 0) {
      throw new Error('El archivo de texto está vacío.');
    }

    const guessedDelimiter = detectBestDelimiter(text);
    const result = Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      delimiter: guessedDelimiter,
      delimitersToGuess: [',', ';', '\t', '|'],
      transformHeader: (h) => h.trim(),
    });

    if (!result.data || result.data.length === 0) {
      throw new Error('No se encontraron filas de datos válidas en el archivo.');
    }

    const columns = (result.meta.fields ?? []).filter((f) => f && f.trim() !== '');
    if (columns.length === 0) {
      throw new Error('No se detectaron columnas válidas en la primera fila de encabezados.');
    }

    const usedDelim = result.meta.delimiter || guessedDelimiter || ',';
    const delimLabel =
      usedDelim === '\t'
        ? 'Tabulación (\\t)'
        : usedDelim === ';'
          ? 'Punto y coma (;)'
          : usedDelim === '|'
            ? 'Barra vertical (|)'
            : 'Coma (,)';

    return {
      dataset: {
        fileName: file.name,
        fileSizeBytes: file.size,
        format: ext === 'txt' ? 'TXT' : 'CSV',
        encoding,
        delimiter: delimLabel,
        columns,
        rows: result.data,
      },
    };
  }

  if (ext === 'json') {
    const { text, encoding } = decodeBufferWithEncoding(buffer);
    if (text.trim().length === 0) {
      throw new Error('El archivo JSON está vacío.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('El archivo JSON no tiene una sintaxis válida.');
    }

    const rows = normalizeJsonToRows(parsed);
    const columnSet = new Set<string>();
    for (const r of rows) {
      if (r && typeof r === 'object') {
        Object.keys(r).forEach((k) => columnSet.add(k));
      }
    }
    const columns = Array.from(columnSet).filter((c) => c.trim() !== '');
    if (columns.length === 0) {
      throw new Error('El archivo JSON no contiene propiedades válidas para formar columnas.');
    }

    return {
      dataset: {
        fileName: file.name,
        fileSizeBytes: file.size,
        format: 'JSON',
        encoding,
        columns,
        rows,
      },
    };
  }

  throw new Error(
    `Formato ".${ext || 'desconocido'}" no soportado. Usa archivos CSV, TXT, Excel (.xlsx, .xls) o JSON.`
  );
}

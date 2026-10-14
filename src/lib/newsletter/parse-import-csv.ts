export type ParsedContact = { line: number; name: string; email: string };
export type ParsedContacts = { valid: ParsedContact[]; invalid: number; duplicates: number; total: number; errors: string[] };

function splitCsv(source: string, delimiter: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(field); field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field); field = ""; if (row.some(v => v.trim())) rows.push(row); row = [];
    } else { field += c; }
  }
  if (quoted) throw new Error("CSV com aspas não fechadas.");
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

export function parseNewsletterCsv(source: string): ParsedContacts {
  const clean = source.replace(/^\uFEFF/, "");
  const headerLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", ",", "\t"].sort((a, b) => headerLine.split(b).length - headerLine.split(a).length)[0];
  const rows = splitCsv(clean, delimiter);
  if (!rows.length) throw new Error("O ficheiro está vazio.");
  const headers = rows[0].map(x => x.trim().toLowerCase().replace(/[\s-]/g, "_"));
  const namePos = headers.findIndex(x => ["nome", "name", "nome_completo", "full_name"].includes(x));
  const emailPos = headers.findIndex(x => ["email", "e_mail", "endereco_de_email", "endereço_de_email"].includes(x));
  if (namePos < 0 || emailPos < 0) throw new Error("O CSV precisa das colunas nome,email (ou name,email).");
  const valid: ParsedContact[] = []; const seen = new Set<string>(); const errors: string[] = [];
  let invalid = 0, duplicates = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[namePos] ?? "").trim().replace(/\s+/g, " ");
    const email = (row[emailPos] ?? "").trim().toLowerCase();
    if (name.length < 2 || name.length > 120 || email.length > 254 ||
        !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)) {
      invalid++; if (errors.length < 8) errors.push(`Linha ${i + 1}: nome ou email inválido`); continue;
    }
    if (seen.has(email)) { duplicates++; continue; }
    seen.add(email);
    valid.push({ line: i + 1, name, email });
  }
  return { valid, invalid, duplicates, total: rows.length - 1, errors };
}

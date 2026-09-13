import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function workbookToBuffer(rows: Record<string, unknown>[], sheetName: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Oyame Tiase Assembly";
  const sheet = workbook.addWorksheet(sheetName);
  if (!rows.length) {
    sheet.addRow(["No records"]);
  } else {
    const columns = Object.keys(rows[0]);
    sheet.columns = columns.map((key) => ({ header: key, key, width: 22 }));
    rows.forEach((row) => sheet.addRow(row));
  }
  return workbook.xlsx.writeBuffer();
}

export function tablePdf(title: string, columns: string[], rows: (string | number)[][]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("The Church of Pentecost", 14, 16);
  doc.setFontSize(11);
  doc.text("Oyame Tiase Assembly", 14, 22);
  doc.setFontSize(13);
  doc.text(title, 14, 32);
  autoTable(doc, {
    startY: 38,
    head: [columns],
    body: rows,
    styles: { fontSize: 9 },
  });
  return doc.output("arraybuffer");
}

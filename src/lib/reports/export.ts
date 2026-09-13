import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EMPTY_PERIOD, type BuiltReport } from "@/lib/reports/types";

const BLUE: [number, number, number] = [11, 36, 71];
const GOLD: [number, number, number] = [196, 149, 56];

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
    body: rows.length ? rows : [[EMPTY_PERIOD]],
    styles: { fontSize: 9 },
  });
  return doc.output("arraybuffer");
}

export function reportCsv(report: BuiltReport) {
  const lines: string[] = [
    csvRow([report.churchName]),
    csvRow([report.assemblyName]),
    csvRow([report.title]),
    csvRow(["Theme", report.theme?.title ?? "No theme recorded for this year."]),
    csvRow(["Period", report.periodLabel]),
    csvRow(["Generated", formatStamp(report.generatedAt)]),
    csvRow(["Prepared by", report.preparedBy]),
    "",
  ];
  for (const section of report.sections) {
    lines.push(csvRow([section.title]));
    if (section.empty) {
      lines.push(csvRow([EMPTY_PERIOD]));
    } else if (section.stats) {
      lines.push(csvRow(["Item", "Value"]));
      for (const stat of section.stats) lines.push(csvRow([stat.label, stat.value]));
    } else if (section.columns && section.rows) {
      lines.push(csvRow(section.columns));
      for (const row of section.rows) lines.push(csvRow(row.map(String)));
    }
    if (section.note) lines.push(csvRow([section.note]));
    lines.push("");
  }
  return lines.join("\n");
}

export async function reportWorkbook(report: BuiltReport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = report.assemblyName;
  workbook.created = new Date();
  const cover = workbook.addWorksheet("Report");
  cover.mergeCells("A1:D1");
  cover.getCell("A1").value = report.churchName.toUpperCase();
  cover.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF0B2447" } };
  cover.mergeCells("A2:D2");
  cover.getCell("A2").value = report.assemblyName.toUpperCase();
  cover.getCell("A2").font = { bold: true, size: 14 };
  cover.mergeCells("A3:D3");
  cover.getCell("A3").value = report.title;
  cover.getCell("A3").font = { bold: true, size: 12 };
  cover.getCell("A5").value = "Theme";
  cover.mergeCells("B5:D5");
  cover.getCell("B5").value = report.theme?.title
    ? `“${report.theme.title}”`
    : "No theme recorded for this year.";
  if (report.theme?.scripture) {
    cover.getCell("A6").value = "Theme scripture";
    cover.mergeCells("B6:D6");
    cover.getCell("B6").value = report.theme.scripture;
  }
  cover.getCell("A8").value = "Period";
  cover.getCell("B8").value = report.periodLabel;
  cover.getCell("A9").value = "Generated";
  cover.getCell("B9").value = formatStamp(report.generatedAt);
  cover.getCell("A10").value = "Prepared by";
  cover.getCell("B10").value = report.preparedBy;
  cover.getCell("A11").value = "Approved by";
  cover.getCell("B11").value = report.approvedBy;

  let rowNumber = 13;
  for (const section of report.sections) {
    cover.mergeCells(`A${rowNumber}:D${rowNumber}`);
    cover.getCell(`A${rowNumber}`).value = section.title;
    cover.getCell(`A${rowNumber}`).font = { bold: true };
    rowNumber += 1;
    if (section.empty) {
      cover.getCell(`A${rowNumber}`).value = EMPTY_PERIOD;
      rowNumber += 2;
      continue;
    }
    if (section.stats) {
      for (const stat of section.stats) {
        cover.getCell(`A${rowNumber}`).value = stat.label;
        cover.getCell(`B${rowNumber}`).value = stat.value;
        rowNumber += 1;
      }
    }
    if (section.columns && section.rows) {
      section.columns.forEach((column, index) => {
        cover.getCell(rowNumber, index + 1).value = column;
        cover.getCell(rowNumber, index + 1).font = { bold: true };
      });
      rowNumber += 1;
      for (const row of section.rows) {
        row.forEach((value, index) => {
          cover.getCell(rowNumber, index + 1).value = value;
        });
        rowNumber += 1;
      }
    }
    if (section.note) {
      cover.mergeCells(`A${rowNumber}:D${rowNumber}`);
      cover.getCell(`A${rowNumber}`).value = section.note;
      rowNumber += 1;
    }
    rowNumber += 1;
  }

  cover.getCell(`A${rowNumber + 1}`).value = "Prepared by";
  cover.getCell(`C${rowNumber + 1}`).value = "Approved by";
  cover.getCell(`A${rowNumber + 2}`).value = "Name: ________________________";
  cover.getCell(`C${rowNumber + 2}`).value = "Name: ________________________";
  cover.getCell(`A${rowNumber + 3}`).value = "Signature: ___________________";
  cover.getCell(`C${rowNumber + 3}`).value = "Signature: ___________________";
  cover.getCell(`A${rowNumber + 4}`).value = "Date: ________________________";
  cover.getCell(`C${rowNumber + 4}`).value = "Date: ________________________";
  cover.columns = [{ width: 28 }, { width: 28 }, { width: 28 }, { width: 28 }];
  return workbook.xlsx.writeBuffer();
}

export function reportPdf(report: BuiltReport) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 28, pageWidth, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(report.churchName.toUpperCase(), pageWidth / 2, 12, { align: "center" });
  doc.setFontSize(12);
  doc.text(report.assemblyName.toUpperCase(), pageWidth / 2, 19, { align: "center" });
  doc.setTextColor(11, 36, 71);
  doc.setFontSize(13);
  doc.text(report.title, pageWidth / 2, 40, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Theme:", 14, 50);
  const themeText = report.theme?.title
    ? `“${report.theme.title}”`
    : "No theme recorded for this year.";
  const themeLines = doc.splitTextToSize(themeText, pageWidth - 28);
  doc.setFont("helvetica", "italic");
  doc.text(themeLines, 14, 56);
  let cursor = 56 + themeLines.length * 5 + 4;
  if (report.theme?.scripture) {
    doc.setFont("helvetica", "normal");
    const scripture = doc.splitTextToSize(`Theme scripture: ${report.theme.scripture}`, pageWidth - 28);
    doc.text(scripture, 14, cursor);
    cursor += scripture.length * 5 + 2;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Period: ${report.periodLabel}`, 14, cursor);
  cursor += 5;
  doc.text(`Report generation date: ${formatStamp(report.generatedAt)}`, 14, cursor);
  cursor += 5;
  doc.text(`Prepared by: ${report.preparedBy}`, 14, cursor);
  cursor += 5;
  doc.text(`Approved by: ${report.approvedBy}`, 14, cursor);
  cursor += 8;

  for (const section of report.sections) {
    if (cursor > 250) {
      doc.addPage();
      cursor = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(section.title, 14, cursor);
    cursor += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (section.empty) {
      doc.text(EMPTY_PERIOD, 14, cursor);
      cursor += 10;
      continue;
    }
    if (section.stats) {
      autoTable(doc, {
        startY: cursor,
        head: [["Item", "Value"]],
        body: section.stats.map((stat) => [stat.label, stat.value]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: BLUE },
        margin: { left: 14, right: 14 },
      });
      cursor = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursor) + 8;
    }
    if (section.columns && section.rows) {
      autoTable(doc, {
        startY: cursor,
        head: [section.columns],
        body: section.rows.map((row) => row.map(String)),
        styles: { fontSize: 8 },
        headStyles: { fillColor: BLUE },
        margin: { left: 14, right: 14 },
      });
      cursor = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursor) + 8;
    }
    if (section.note) {
      const notes = doc.splitTextToSize(section.note, pageWidth - 28);
      doc.text(notes, 14, cursor);
      cursor += notes.length * 5 + 6;
    }
  }

  if (cursor > 240) {
    doc.addPage();
    cursor = 24;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Authorization", 14, cursor);
  cursor += 10;
  doc.setFont("helvetica", "normal");
  doc.text("Prepared by", 14, cursor);
  doc.text("Approved by", 110, cursor);
  cursor += 14;
  doc.text("Name: ________________________", 14, cursor);
  doc.text("Name: ________________________", 110, cursor);
  cursor += 12;
  doc.text("Signature: ___________________", 14, cursor);
  doc.text("Signature: ___________________", 110, cursor);
  cursor += 12;
  doc.text("Date: ________________________", 14, cursor);
  doc.text("Date: ________________________", 110, cursor);
  return doc.output("arraybuffer");
}

function csvRow(values: (string | number)[]) {
  return values
    .map((value) => {
      const text = String(value ?? "");
      if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
      return text;
    })
    .join(",");
}

function formatStamp(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

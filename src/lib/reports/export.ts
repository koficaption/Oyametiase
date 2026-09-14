import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import jsPDF, { GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { ASSEMBLY_NAME } from "@/lib/assembly";
import { EMPTY_PERIOD, type BuiltReport } from "@/lib/reports/types";

const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];

function emblemBytes() {
  try {
    return readFileSync(join(process.cwd(), "public", "cop-emblem.png"));
  } catch {
    return null;
  }
}

function emblemDataUrl(bytes: Buffer) {
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export async function workbookToBuffer(rows: Record<string, unknown>[], sheetName: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = ASSEMBLY_NAME;
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

export async function tablePdf(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  assemblyName = ASSEMBLY_NAME,
) {
  const doc = new jsPDF();
  const emblem = emblemBytes();
  if (emblem) {
    doc.addImage(emblemDataUrl(emblem), "PNG", 96, 8, 18, 18, "cop-emblem", "FAST");
  }
  doc.setTextColor(...BLACK);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("The Church of Pentecost", 105, 32, { align: "center" });
  doc.setFontSize(11);
  doc.text(assemblyName, 105, 38, { align: "center" });
  doc.setFontSize(12);
  doc.text(title, 105, 46, { align: "center" });
  autoTable(doc, {
    startY: 52,
    head: [columns],
    body: rows.length ? rows : [[EMPTY_PERIOD]],
    styles: { fontSize: 9, textColor: BLACK, lineColor: BLACK, lineWidth: 0.2 },
    headStyles: { fillColor: WHITE, textColor: BLACK, fontStyle: "bold", lineColor: BLACK, lineWidth: 0.3 },
  });
  stampWatermark(doc, emblem);
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
  const emblem = emblemBytes();
  if (emblem) {
    const imageId = workbook.addImage({
      buffer: emblem as unknown as Parameters<ExcelJS.Workbook["addImage"]>[0]["buffer"],
      extension: "png",
    });
    cover.addImage(imageId, { tl: { col: 1.6, row: 0 }, ext: { width: 64, height: 64 } });
  }
  cover.mergeCells("A5:D5");
  cover.getCell("A5").value = report.churchName.toUpperCase();
  cover.getCell("A5").font = { bold: true, size: 16, color: { argb: "FF000000" } };
  cover.getCell("A5").alignment = { horizontal: "center" };
  cover.mergeCells("A6:D6");
  cover.getCell("A6").value = report.assemblyName.toUpperCase();
  cover.getCell("A6").font = { bold: true, size: 13, color: { argb: "FF000000" } };
  cover.getCell("A6").alignment = { horizontal: "center" };
  cover.mergeCells("A7:D7");
  cover.getCell("A7").value = report.title;
  cover.getCell("A7").font = { bold: true, size: 12, color: { argb: "FF000000" } };
  cover.getCell("A7").alignment = { horizontal: "center" };
  cover.getCell("A9").value = "Theme";
  cover.mergeCells("B9:D9");
  cover.getCell("B9").value = report.theme?.title
    ? `“${report.theme.title}”`
    : "No theme recorded for this year.";
  if (report.theme?.scripture) {
    cover.getCell("A10").value = "Theme scripture";
    cover.mergeCells("B10:D10");
    cover.getCell("B10").value = report.theme.scripture;
  }
  cover.getCell("A12").value = "Period";
  cover.getCell("B12").value = report.periodLabel;
  cover.getCell("A13").value = "Generated";
  cover.getCell("B13").value = formatStamp(report.generatedAt);
  cover.getCell("A14").value = "Prepared by";
  cover.getCell("B14").value = report.preparedBy;
  cover.getCell("A15").value = "Approved by";
  cover.getCell("B15").value = report.approvedBy;

  let rowNumber = 17;
  for (const section of report.sections) {
    cover.mergeCells(`A${rowNumber}:D${rowNumber}`);
    cover.getCell(`A${rowNumber}`).value = section.title;
    cover.getCell(`A${rowNumber}`).font = { bold: true, color: { argb: "FF000000" } };
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
        cover.getCell(rowNumber, index + 1).font = { bold: true, color: { argb: "FF000000" } };
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

export async function reportPdf(report: BuiltReport) {
  const doc = new jsPDF();
  const emblem = emblemBytes();
  const pageWidth = doc.internal.pageSize.getWidth();
  if (emblem) {
    doc.addImage(emblemDataUrl(emblem), "PNG", pageWidth / 2 - 11, 8, 22, 22, "cop-emblem", "FAST");
  }
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(report.churchName.toUpperCase(), pageWidth / 2, 36, { align: "center" });
  doc.setFontSize(11);
  doc.text(report.assemblyName.toUpperCase(), pageWidth / 2, 42, { align: "center" });
  doc.setFontSize(12);
  doc.text(report.title, pageWidth / 2, 50, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Theme:", 14, 60);
  const themeText = report.theme?.title
    ? `“${report.theme.title}”`
    : "No theme recorded for this year.";
  const themeLines = doc.splitTextToSize(themeText, pageWidth - 28);
  doc.setFont("helvetica", "italic");
  doc.text(themeLines, 14, 66);
  let cursor = 66 + themeLines.length * 5 + 4;
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

  const tableTheme = {
    styles: { fontSize: 9, textColor: BLACK, lineColor: BLACK, lineWidth: 0.2 },
    headStyles: { fillColor: WHITE, textColor: BLACK, fontStyle: "bold" as const, lineColor: BLACK, lineWidth: 0.3 },
    margin: { left: 14, right: 14 },
  };

  for (const section of report.sections) {
    if (cursor > 250) {
      doc.addPage();
      cursor = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
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
        ...tableTheme,
      });
      cursor = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursor) + 8;
    }
    if (section.columns && section.rows) {
      autoTable(doc, {
        startY: cursor,
        head: [section.columns],
        body: section.rows.map((row) => row.map(String)),
        styles: { ...tableTheme.styles, fontSize: 8 },
        headStyles: tableTheme.headStyles,
        margin: tableTheme.margin,
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
  doc.setTextColor(...BLACK);
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

  stampWatermark(doc, emblem);
  return doc.output("arraybuffer");
}

function stampWatermark(doc: jsPDF, emblem: Buffer | null) {
  if (!emblem) return;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const image = emblemDataUrl(emblem);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.08 }));
    doc.addImage(image, "PNG", pageWidth / 2 - 38, pageHeight / 2 - 38, 76, 76, "cop-emblem", "FAST");
    doc.restoreGraphicsState();
    doc.setTextColor(...BLACK);
    doc.setFontSize(8);
    doc.text(`Page ${page} of ${pages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }
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

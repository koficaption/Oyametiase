import Image from "next/image";
import { EMPTY_PERIOD, type BuiltReport } from "@/lib/reports/types";

export function ReportPreview({ report }: { report: BuiltReport }) {
  return (
    <div className="space-y-6 rounded-xl border border-black/20 bg-white p-5 text-black">
      <div className="space-y-2 border-b border-black pb-4 text-center">
        <Image
          src="/cop-emblem.png"
          alt="The Church of Pentecost"
          width={72}
          height={72}
          className="mx-auto h-16 w-16 object-contain"
        />
        <p className="text-xs font-semibold tracking-wide">{report.churchName.toUpperCase()}</p>
        <p className="text-sm font-semibold tracking-wide">{report.assemblyName.toUpperCase()}</p>
        <h2 className="text-xl font-semibold">{report.title}</h2>
        <p className="text-sm">{report.periodLabel}</p>
      </div>
      <div className="space-y-1 text-center text-sm">
        <p className="font-semibold">{report.theme ? `${report.theme.year} Church Theme` : "Church Theme"}</p>
        <p className="italic">
          {report.theme?.title ? `“${report.theme.title}”` : "No theme recorded for this year."}
        </p>
        {report.theme?.scripture ? <p>{report.theme.scripture}</p> : null}
      </div>
      {report.restrictedNote ? <p className="text-sm">{report.restrictedNote}</p> : null}
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <p>Generated: {new Date(report.generatedAt).toLocaleString()}</p>
        <p>Prepared by: {report.preparedBy}</p>
        <p>Approved by: {report.approvedBy}</p>
      </div>
      {report.sections.map((section) => (
        <section key={section.title} className="space-y-3 border-t border-black/30 pt-4">
          <h3 className="font-semibold">{section.title}</h3>
          {section.empty ? <p className="text-sm">{EMPTY_PERIOD}</p> : null}
          {section.stats ? (
            <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {section.stats.map((stat) => (
                <div key={stat.label} className="border border-black/20 p-3">
                  <dt className="text-xs">{stat.label}</dt>
                  <dd className="font-medium">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {section.columns && section.rows ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {section.columns.map((column) => (
                      <th key={column} className="border-b border-black py-2 pr-3 font-medium">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, index) => (
                    <tr key={`${section.title}-${index}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border-b border-black/20 py-2 pr-3">{String(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {section.note && !section.empty ? <p className="text-sm">{section.note}</p> : null}
        </section>
      ))}
      <section className="grid gap-6 border-t border-black pt-4 sm:grid-cols-2">
        <div>
          <p className="font-medium">Prepared by</p>
          <p className="mt-6 text-sm">Name: ________________________</p>
          <p className="mt-3 text-sm">Signature: ___________________</p>
          <p className="mt-3 text-sm">Date: ________________________</p>
        </div>
        <div>
          <p className="font-medium">Approved by</p>
          <p className="mt-6 text-sm">Name: ________________________</p>
          <p className="mt-3 text-sm">Signature: ___________________</p>
          <p className="mt-3 text-sm">Date: ________________________</p>
        </div>
      </section>
    </div>
  );
}

import { ThemeBanner } from "@/components/church/theme-banner";
import { EMPTY_PERIOD, type BuiltReport } from "@/lib/reports/types";

export function ReportPreview({ report }: { report: BuiltReport }) {
  return (
    <div className="space-y-6 rounded-xl border bg-card p-5">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary">{report.churchName.toUpperCase()}</p>
        <p className="text-sm font-semibold tracking-wide">{report.assemblyName.toUpperCase()}</p>
        <h2 className="text-xl font-semibold">{report.title}</h2>
        <p className="text-sm text-muted-foreground">{report.periodLabel}</p>
      </div>
      <ThemeBanner theme={report.theme} compact />
      {report.restrictedNote ? <p className="text-sm text-muted-foreground">{report.restrictedNote}</p> : null}
      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
        <p>Generated: {new Date(report.generatedAt).toLocaleString()}</p>
        <p>Prepared by: {report.preparedBy}</p>
        <p>Approved by: {report.approvedBy}</p>
      </div>
      {report.sections.map((section) => (
        <section key={section.title} className="space-y-3 border-t pt-4">
          <h3 className="font-semibold">{section.title}</h3>
          {section.empty ? <p className="text-sm text-muted-foreground">{EMPTY_PERIOD}</p> : null}
          {section.stats ? (
            <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {section.stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
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
                      <th key={column} className="border-b py-2 pr-3 font-medium">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, index) => (
                    <tr key={`${section.title}-${index}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border-b py-2 pr-3">{String(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {section.note && !section.empty ? <p className="text-sm text-muted-foreground">{section.note}</p> : null}
        </section>
      ))}
      <section className="grid gap-6 border-t pt-4 sm:grid-cols-2">
        <div>
          <p className="font-medium">Prepared by</p>
          <p className="mt-6 text-sm text-muted-foreground">Name: ________________________</p>
          <p className="mt-3 text-sm text-muted-foreground">Signature: ___________________</p>
          <p className="mt-3 text-sm text-muted-foreground">Date: ________________________</p>
        </div>
        <div>
          <p className="font-medium">Approved by</p>
          <p className="mt-6 text-sm text-muted-foreground">Name: ________________________</p>
          <p className="mt-3 text-sm text-muted-foreground">Signature: ___________________</p>
          <p className="mt-3 text-sm text-muted-foreground">Date: ________________________</p>
        </div>
      </section>
    </div>
  );
}

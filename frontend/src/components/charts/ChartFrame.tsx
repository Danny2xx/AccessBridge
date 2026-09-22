import { Table2, BarChart3 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { EvidenceTag, type EvidenceStatus } from "../EvidenceTag";

export type ChartTable = {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

type ChartFrameProps = {
  title: string;
  tags: EvidenceStatus[];
  intro?: ReactNode;
  table?: ChartTable;
  takeaway?: ReactNode;
  wide?: boolean;
  children: ReactNode;
};

export function ChartFrame({ title, tags, intro, table, takeaway, wide = false, children }: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();
  return (
    <section className={`chart-frame${wide ? " chart-frame--wide" : ""}`} aria-labelledby={headingId}>
      <header className="chart-header">
        <h3 id={headingId}>{title}</h3>
        <div className="chart-tags">
          {tags.map((tag) => (
            <EvidenceTag key={tag} status={tag} />
          ))}
        </div>
      </header>
      {intro ? <p className="chart-intro">{intro}</p> : null}
      {showTable && table ? (
        <div className="chart-table-wrap">
          <table className="data-table">
            <caption className="visually-hidden">{table.caption}</caption>
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th key={cellIndex} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={cellIndex}>{cell}</td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
      {takeaway || table ? (
        <footer className="chart-footer">
          {takeaway ? <p className="chart-takeaway">{takeaway}</p> : <span />}
          {table ? (
            <button
              type="button"
              className="chart-view-toggle"
              aria-pressed={showTable}
              onClick={() => setShowTable((value) => !value)}
            >
              {showTable ? <BarChart3 size={15} aria-hidden="true" /> : <Table2 size={15} aria-hidden="true" />}
              {showTable ? "Show chart" : "Show table"}
            </button>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}

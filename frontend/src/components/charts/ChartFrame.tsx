import { BarChart3, Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { EvidenceTag, type EvidenceStatus } from "@/components/EvidenceTag";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
    <Card
      data-testid="chart-card"
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 gap-4 rounded-2xl border-border/80 bg-card/70 p-6 backdrop-blur transition-colors hover:border-input",
        wide && "lg:col-span-2"
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 id={headingId} className="text-xl font-extrabold tracking-tight">
          {title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <EvidenceTag key={tag} status={tag} />
          ))}
        </div>
      </header>

      {intro ? <p className="max-w-[70ch] text-sm text-muted-foreground">{intro}</p> : null}

      {showTable && table ? (
        <div className="overflow-x-auto">
          <Table>
            <caption className="visually-hidden">{table.caption}</caption>
            <TableHeader>
              <TableRow>
                {table.columns.map((column, index) => (
                  <TableHead key={column} className={cn("text-dim", index > 0 && "text-right")}>
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      className={cn("tabular", cellIndex === 0 ? "font-semibold" : "text-right")}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        children
      )}

      {takeaway || table ? (
        <footer className="mt-auto flex flex-wrap items-end justify-between gap-x-5 gap-y-3 border-t border-border pt-4">
          {takeaway ? (
            <p className="max-w-[72ch] flex-1 basis-80 font-semibold leading-snug">{takeaway}</p>
          ) : (
            <span />
          )}
          {table ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              aria-pressed={showTable}
              onClick={() => setShowTable((value) => !value)}
            >
              {showTable ? <BarChart3 aria-hidden="true" /> : <Table2 aria-hidden="true" />}
              {showTable ? "Show chart" : "Show table"}
            </Button>
          ) : null}
        </footer>
      ) : null}
    </Card>
  );
}

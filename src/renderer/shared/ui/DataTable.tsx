export type DataTableColumn<TRow> = {
  key: string;
  title: string;
  render: (row: TRow) => React.ReactNode;
  className?: string;
};

type DataTableProps<TRow> = {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow) => string;
  emptyText?: string;
};

export function DataTable<TRow>({
  columns,
  rows,
  getRowKey,
  emptyText = 'Нет данных'
}: DataTableProps<TRow>): React.JSX.Element {
  return (
    <div className="overflow-auto rounded-lg border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead className="sticky top-0 bg-slate-900">
          <tr>
            {columns.map((column) => (
              <th
                className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-slate-500 ${column.className ?? ''}`}
                key={column.key}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-slate-950/35">
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-slate-500" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr className="hover:bg-white/[0.03]" key={getRowKey(row)}>
                {columns.map((column) => (
                  <td className={`px-3 py-3 align-top text-slate-200 ${column.className ?? ''}`} key={column.key}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

import type { ReactNode } from "react";

import { EmptyState } from "./Card";

export interface DataTableProps {
  headers: readonly ReactNode[];
  isEmpty: boolean;
  emptyMessage: ReactNode;
  children: ReactNode;
}

export function DataTable({ headers, isEmpty, emptyMessage, children }: DataTableProps) {
  if (isEmpty) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import type { AdminReport } from './types'

interface ReportsTableProps {
  reports: AdminReport[]
}

function getStatusVariant(status: AdminReport['status']) {
  if (status === 'OPEN') {
    return 'destructive'
  }

  if (status === 'RESOLVED') {
    return 'default'
  }

  return 'secondary'
}

export function ReportsTable({ reports }: ReportsTableProps) {
  if (reports.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        No reports found.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table data-testid="reports-table">
        <TableHeader>
          <TableRow>
            <TableHead>Reporter</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reported At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">
                <div>{report.reporter.name}</div>
                <div className="text-xs text-muted-foreground">{report.reporter.email}</div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <div>{report.targetUserId ? `User: ${report.targetUserId}` : 'No user target'}</div>
                <div>{report.targetRideId ? `Ride: ${report.targetRideId}` : 'No ride target'}</div>
              </TableCell>
              <TableCell className="max-w-sm whitespace-normal break-words text-sm">
                {report.reason}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(report.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

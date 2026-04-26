import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import type { PendingDriver } from './types'

interface DriverApprovalTableProps {
  drivers: PendingDriver[]
  activeDecisionId: string | null
  onApprove: (driverId: string) => void
  onReject: (driverId: string) => void
}

function formatVehicle(driver: PendingDriver) {
  if (!driver.vehicle) {
    return 'No vehicle information submitted'
  }

  return `${driver.vehicle.make} ${driver.vehicle.model} (${driver.vehicle.plateNumber})`
}

export function DriverApprovalTable({
  drivers,
  activeDecisionId,
  onApprove,
  onReject,
}: DriverApprovalTableProps) {
  if (drivers.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        No pending driver applications.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table data-testid="driver-approval-table">
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Licence</TableHead>
            <TableHead>Insurance</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((driver) => {
            const isPending = activeDecisionId === driver.id

            return (
              <TableRow key={driver.id} data-testid={`driver-row-${driver.id}`}>
                <TableCell className="font-medium">{driver.name}</TableCell>
                <TableCell>
                  {driver.licenceSignedUrl ? (
                    <a
                      href={driver.licenceSignedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-fit"
                    >
                      <img
                        src={driver.licenceSignedUrl}
                        alt={`${driver.name} licence`}
                        className="h-24 w-40 rounded-md border object-cover"
                        data-testid={`licence-image-${driver.id}`}
                      />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No licence uploaded</span>
                  )}
                </TableCell>
                <TableCell>
                  {driver.insuranceSignedUrl ? (
                    <a
                      href={driver.insuranceSignedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm text-primary hover:underline"
                    >
                      View insurance
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No insurance uploaded</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatVehicle(driver)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onApprove(driver.id)}
                      disabled={isPending}
                      data-testid={`approve-${driver.id}`}
                    >
                      {isPending ? 'Saving…' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject(driver.id)}
                      disabled={isPending}
                      data-testid={`reject-${driver.id}`}
                    >
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

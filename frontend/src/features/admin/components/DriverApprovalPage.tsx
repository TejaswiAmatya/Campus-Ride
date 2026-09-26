import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { api } from '@/api/client'
import { Button } from '@/components/ui/button'

import { DriverApprovalTable } from './DriverApprovalTable'
import { pendingDriversQueryKey, usePendingDrivers } from '../hooks/usePendingDrivers'
import type { PendingDriver } from '../types'

interface DriverDecisionVariables {
  id: string
  approved: boolean
}

interface DriverDecisionContext {
  previousDrivers: PendingDriver[]
}

export function DriverApprovalPage() {
  const queryClient = useQueryClient()
  const {
    data: pendingDrivers = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePendingDrivers()

  const driverDecisionMutation = useMutation({
    mutationFn: ({ id, approved }: DriverDecisionVariables) =>
      api.patch(`/api/admin/drivers/${id}/decision`, { approved }),
    onMutate: async ({ id }): Promise<DriverDecisionContext> => {
      await queryClient.cancelQueries({ queryKey: pendingDriversQueryKey })

      const previousDrivers = queryClient.getQueryData<PendingDriver[]>(pendingDriversQueryKey) ?? []

      queryClient.setQueryData<PendingDriver[]>(
        pendingDriversQueryKey,
        previousDrivers.filter((driver) => driver.id !== id),
      )

      return { previousDrivers }
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(pendingDriversQueryKey, context.previousDrivers)
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: pendingDriversQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['adminStats'] })
    },
  })

  const activeDecisionId = driverDecisionMutation.isPending
    ? driverDecisionMutation.variables?.id ?? null
    : null

  const queryErrorMessage =
    error instanceof Error ? error.message : 'Unable to load pending driver applications.'
  const decisionErrorMessage =
    driverDecisionMutation.error instanceof Error
      ? driverDecisionMutation.error.message
      : 'Unable to update the driver application decision.'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Driver Approvals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Review pending driver applications and approve or reject each applicant.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link to="/admin">Back to dashboard</Link>
        </Button>
      </div>

      {driverDecisionMutation.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {decisionErrorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="space-y-3">
              <div>
                <p className="font-medium text-destructive">
                  Failed to load pending driver applications.
                </p>
                <p className="text-destructive/80">{queryErrorMessage}</p>
              </div>
              <Button onClick={() => void refetch()} disabled={isFetching} variant="outline">
                {isFetching ? 'Retrying…' : 'Retry'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <DriverApprovalTable
          drivers={pendingDrivers}
          activeDecisionId={activeDecisionId}
          onApprove={(id) => driverDecisionMutation.mutate({ id, approved: true })}
          onReject={(id) => driverDecisionMutation.mutate({ id, approved: false })}
        />
      )}
    </div>
  )
}

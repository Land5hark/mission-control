'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useMissionControl, type ExecApprovalRequest } from '@/store'
import { useWebSocket } from '@/lib/websocket'

type FilterTab = 'all' | 'pending' | 'resolved'

const RISK_BORDER: Record<ExecApprovalRequest['risk'], string> = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
}

const RISK_BADGE: Record<ExecApprovalRequest['risk'], { bg: string; text: string }> = {
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  critical: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ExecApprovalPanel() {
  const { execApprovals, updateExecApproval } = useMissionControl()
  const { sendMessage } = useWebSocket()
  const [filter, setFilter] = useState<FilterTab>('pending')

  const pendingCount = execApprovals.filter(a => a.status === 'pending').length

  // Mark expired approvals client-side
  const now = Date.now()
  const displayApprovals = useMemo(() => {
    const withExpiry = execApprovals.map(a => {
      if (a.status === 'pending' && a.expiresAt && a.expiresAt < now) {
        return { ...a, status: 'expired' as const }
      }
      return a
    })

    return withExpiry.filter(a => {
      if (filter === 'pending') return a.status === 'pending'
      if (filter === 'resolved') return a.status !== 'pending'
      return true
    })
  }, [execApprovals, filter, now])

  const handleAction = (id: string, decision: 'allow-once' | 'allow-always' | 'deny') => {
    // Send via WebSocket RPC
    const sent = sendMessage({
      type: 'req',
      method: 'exec.approval.resolve',
      id: `ea-${Date.now()}`,
      params: { id, decision },
    })

    if (!sent) {
      // Fallback to HTTP
      const action = decision === 'deny' ? 'deny' : decision === 'allow-always' ? 'always_allow' : 'approve'
      fetch('/api/exec-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      }).catch(() => {})
    }

    // Optimistic update
    const newStatus = decision === 'deny' ? 'denied' : 'approved'
    updateExecApproval(id, { status: newStatus as ExecApprovalRequest['status'] })
  }

  return (
    <div className="m-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Exec Approvals</h2>
          {pendingCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400 animate-pulse">
              {pendingCount} pending
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          Real-time via WebSocket
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {(['all', 'pending', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-sm capitalize transition-colors ${
              filter === tab
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Approval list */}
      {displayApprovals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {filter === 'pending'
            ? 'No pending approvals. Execution requests from agents will appear here as an overlay.'
            : 'No approvals to display.'}
        </div>
      ) : (
        <div className="space-y-3">
          {displayApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ApprovalCard({
  approval,
  onAction,
}: {
  approval: ExecApprovalRequest
  onAction: (id: string, decision: 'allow-once' | 'allow-always' | 'deny') => void
}) {
  const riskBorder = RISK_BORDER[approval.risk]
  const riskBadge = RISK_BADGE[approval.risk]
  const isPending = approval.status === 'pending'
  const isExpired = approval.status === 'expired'

  return (
    <div className={`rounded-lg border border-border bg-card p-4 border-l-4 ${riskBorder}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">
            {approval.agentName || approval.sessionId}
          </span>
          <span className="font-mono text-xs bg-secondary rounded px-1.5 py-0.5 text-muted-foreground">
            {approval.toolName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${riskBadge.bg} ${riskBadge.text}`}>
            {approval.risk}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(approval.createdAt)}
          </span>
        </div>
      </div>

      {/* Command block */}
      {approval.command && (
        <pre className="bg-secondary rounded p-2 text-xs font-mono overflow-auto max-h-20 text-foreground mb-2 border border-border">
          <code>$ {approval.command}</code>
        </pre>
      )}

      {/* Tool args */}
      {!approval.command && approval.toolArgs && Object.keys(approval.toolArgs).length > 0 && (
        <pre className="bg-secondary rounded p-2 text-xs font-mono overflow-auto max-h-32 text-foreground mb-2">
          {JSON.stringify(approval.toolArgs, null, 2)}
        </pre>
      )}

      {/* Metadata */}
      {(approval.cwd || approval.host || approval.resolvedPath) && (
        <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
          {approval.host && <div>Host: <span className="font-mono text-foreground">{approval.host}</span></div>}
          {approval.cwd && <div>CWD: <span className="font-mono text-foreground">{approval.cwd}</span></div>}
          {approval.resolvedPath && <div>Resolved: <span className="font-mono text-foreground">{approval.resolvedPath}</span></div>}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 mt-3">
        {isPending ? (
          <>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onAction(approval.id, 'allow-once')}
            >
              Allow once
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction(approval.id, 'allow-always')}
            >
              Always allow
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => onAction(approval.id, 'deny')}
            >
              Deny
            </Button>
          </>
        ) : isExpired ? (
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Expired
          </span>
        ) : (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              approval.status === 'approved'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {approval.status === 'approved' ? 'Approved' : 'Denied'}
          </span>
        )}
      </div>
    </div>
  )
}

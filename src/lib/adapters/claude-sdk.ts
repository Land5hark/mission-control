import type { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

export class ClaudeSdkAdapter implements FrameworkAdapter {
  readonly framework = 'claude-sdk'

  async register(agent: AgentRegistration): Promise<void> {
    // TODO: implement Claude SDK agent registration
    console.warn(`[claude-sdk] adapter not yet fully implemented; agent ${agent.agentId} registered as stub`)
  }

  async heartbeat(_payload: HeartbeatPayload): Promise<void> {
    // TODO: implement Claude SDK heartbeat
  }

  async reportTask(_report: TaskReport): Promise<void> {
    // TODO: implement Claude SDK task reporting
  }

  async getAssignments(_agentId: string): Promise<Assignment[]> {
    // TODO: implement Claude SDK assignment retrieval
    return []
  }

  async disconnect(_agentId: string): Promise<void> {
    // TODO: implement Claude SDK disconnect
  }
}

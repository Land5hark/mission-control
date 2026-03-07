import type { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

export class AutoGenAdapter implements FrameworkAdapter {
  readonly framework = 'autogen'

  async register(agent: AgentRegistration): Promise<void> {
    // TODO: implement AutoGen agent registration
    console.warn(`[autogen] adapter not yet fully implemented; agent ${agent.agentId} registered as stub`)
  }

  async heartbeat(_payload: HeartbeatPayload): Promise<void> {
    // TODO: implement AutoGen heartbeat
  }

  async reportTask(_report: TaskReport): Promise<void> {
    // TODO: implement AutoGen task reporting
  }

  async getAssignments(_agentId: string): Promise<Assignment[]> {
    // TODO: implement AutoGen assignment retrieval
    return []
  }

  async disconnect(_agentId: string): Promise<void> {
    // TODO: implement AutoGen disconnect
  }
}

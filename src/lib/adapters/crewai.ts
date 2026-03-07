import type { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

export class CrewAIAdapter implements FrameworkAdapter {
  readonly framework = 'crewai'

  async register(agent: AgentRegistration): Promise<void> {
    // TODO: implement CrewAI agent registration
    console.warn(`[crewai] adapter not yet fully implemented; agent ${agent.agentId} registered as stub`)
  }

  async heartbeat(_payload: HeartbeatPayload): Promise<void> {
    // TODO: implement CrewAI heartbeat
  }

  async reportTask(_report: TaskReport): Promise<void> {
    // TODO: implement CrewAI task reporting
  }

  async getAssignments(_agentId: string): Promise<Assignment[]> {
    // TODO: implement CrewAI assignment retrieval
    return []
  }

  async disconnect(_agentId: string): Promise<void> {
    // TODO: implement CrewAI disconnect
  }
}

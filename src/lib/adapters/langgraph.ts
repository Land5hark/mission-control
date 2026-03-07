import type { FrameworkAdapter, AgentRegistration, HeartbeatPayload, TaskReport, Assignment } from './adapter'

export class LangGraphAdapter implements FrameworkAdapter {
  readonly framework = 'langgraph'

  async register(agent: AgentRegistration): Promise<void> {
    // TODO: implement LangGraph agent registration
    console.warn(`[langgraph] adapter not yet fully implemented; agent ${agent.agentId} registered as stub`)
  }

  async heartbeat(_payload: HeartbeatPayload): Promise<void> {
    // TODO: implement LangGraph heartbeat
  }

  async reportTask(_report: TaskReport): Promise<void> {
    // TODO: implement LangGraph task reporting
  }

  async getAssignments(_agentId: string): Promise<Assignment[]> {
    // TODO: implement LangGraph assignment retrieval
    return []
  }

  async disconnect(_agentId: string): Promise<void> {
    // TODO: implement LangGraph disconnect
  }
}

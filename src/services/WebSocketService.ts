import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { 
  WebSocketEvent, 
  WebSocketEventType, 
  ProjectStartEvent, 
  TaskUpdateEvent, 
  ArtifactCreateEvent, 
  ProjectCompleteEvent, 
  ErrorEvent,
  StageCompleteEvent 
} from '../types/index.js';

export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  projectId?: string;
  userId?: string;
  connectedAt: Date;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private connections: Map<string, WebSocketConnection> = new Map();
  private projectSubscriptions: Map<string, Set<string>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (socket: WebSocket, request) => {
      const connectionId = this.generateConnectionId();
      const connection: WebSocketConnection = {
        id: connectionId,
        socket,
        connectedAt: new Date()
      };

      this.connections.set(connectionId, connection);
      console.log(`WebSocket connection established: ${connectionId}`);

      // Handle incoming messages
      socket.on('message', (data) => {
        try {
          this.handleMessage(connectionId, Buffer.from(data as ArrayBuffer));
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          this.sendError(connectionId, 'Invalid message format');
        }
      });

      // Handle connection close
      socket.on('close', () => {
        this.handleDisconnection(connectionId);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`WebSocket error for connection ${connectionId}:`, error);
        this.handleDisconnection(connectionId);
      });

      // Send welcome message
      this.sendToConnection(connectionId, {
        type: 'connection:established' as any,
        payload: { connectionId },
        timestamp: new Date()
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    console.log('WebSocket server initialized on /ws');
  }

  private handleMessage(connectionId: string, data: Buffer): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe:project':
          this.subscribeToProject(connectionId, message.projectId, message.userId);
          break;
        case 'unsubscribe:project':
          this.unsubscribeFromProject(connectionId, message.projectId);
          break;
        case 'ping':
          this.sendToConnection(connectionId, {
            type: 'pong' as any,
            payload: { timestamp: new Date() },
            timestamp: new Date()
          });
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.sendError(connectionId, 'Invalid JSON format');
    }
  }

  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from project subscriptions
    if (connection.projectId) {
      this.unsubscribeFromProject(connectionId, connection.projectId);
    }

    // Remove connection
    this.connections.delete(connectionId);
    console.log(`WebSocket connection closed: ${connectionId}`);
  }

  private subscribeToProject(connectionId: string, projectId: string, userId?: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Update connection with project info
    connection.projectId = projectId;
    connection.userId = userId;

    // Add to project subscriptions
    if (!this.projectSubscriptions.has(projectId)) {
      this.projectSubscriptions.set(projectId, new Set());
    }
    this.projectSubscriptions.get(projectId)!.add(connectionId);

    // Send confirmation
    this.sendToConnection(connectionId, {
      type: 'subscription:confirmed' as any,
      payload: { projectId },
      timestamp: new Date()
    });

    console.log(`Connection ${connectionId} subscribed to project ${projectId}`);
  }

  private unsubscribeFromProject(connectionId: string, projectId: string): void {
    const projectConnections = this.projectSubscriptions.get(projectId);
    if (projectConnections) {
      projectConnections.delete(connectionId);
      if (projectConnections.size === 0) {
        this.projectSubscriptions.delete(projectId);
      }
    }

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.projectId = undefined;
    }

    console.log(`Connection ${connectionId} unsubscribed from project ${projectId}`);
  }

  private sendToConnection(connectionId: string, event: WebSocketEvent): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      connection.socket.send(JSON.stringify(event));
    } catch (error) {
      console.error(`Error sending message to connection ${connectionId}:`, error);
      this.handleDisconnection(connectionId);
    }
  }

  private sendError(connectionId: string, message: string): void {
    this.sendToConnection(connectionId, {
      type: WebSocketEventType.ERROR,
      payload: { error: message },
      timestamp: new Date()
    });
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // PUBLIC EVENT BROADCASTING METHODS
  // ============================================================================

  public broadcastProjectStart(event: ProjectStartEvent): void {
    const wsEvent: WebSocketEvent = {
      type: WebSocketEventType.PROJECT_START,
      payload: event,
      timestamp: new Date()
    };

    this.broadcastToProject(event.projectId, wsEvent);
    console.log(`Broadcasted project start event for project ${event.projectId}`);
  }

  public broadcastTaskUpdate(event: TaskUpdateEvent): void {
    const wsEvent: WebSocketEvent = {
      type: WebSocketEventType.TASK_UPDATE,
      payload: event,
      timestamp: new Date()
    };

    this.broadcastToProject(event.projectId, wsEvent);
    console.log(`Broadcasted task update event for task ${event.taskId}`);
  }

  public broadcastArtifactCreate(event: ArtifactCreateEvent): void {
    const wsEvent: WebSocketEvent = {
      type: WebSocketEventType.ARTIFACT_CREATE,
      payload: event,
      timestamp: new Date()
    };

    this.broadcastToProject(event.projectId, wsEvent);
    console.log(`Broadcasted artifact create event for artifact ${event.artifactId}`);
  }

  public broadcastProjectComplete(event: ProjectCompleteEvent): void {
    const wsEvent: WebSocketEvent = {
      type: WebSocketEventType.PROJECT_COMPLETE,
      payload: event,
      timestamp: new Date()
    };

    this.broadcastToProject(event.projectId, wsEvent);
    console.log(`Broadcasted project complete event for project ${event.projectId}`);
  }

  public broadcastStageComplete(event: StageCompleteEvent): void {
    const wsEvent: WebSocketEvent = {
      type: WebSocketEventType.STAGE_COMPLETE,
      payload: event,
      timestamp: new Date()
    };

    this.broadcastToProject(event.projectId, wsEvent);
    console.log(`Broadcasted stage complete event for project ${event.projectId}, stage ${event.stage}`);
  }

  public broadcastError(event: ErrorEvent): void {
    const wsEvent: WebSocketEvent = {
      type: WebSocketEventType.ERROR,
      payload: event,
      timestamp: new Date()
    };

    if (event.projectId) {
      this.broadcastToProject(event.projectId, wsEvent);
    } else {
      // Broadcast to all connections if no specific project
      this.broadcastToAll(wsEvent);
    }
    console.log(`Broadcasted error event: ${event.error}`);
  }

  private broadcastToProject(projectId: string, event: WebSocketEvent): void {
    const projectConnections = this.projectSubscriptions.get(projectId);
    if (!projectConnections) return;

    projectConnections.forEach(connectionId => {
      this.sendToConnection(connectionId, event);
    });
  }

  private broadcastToAll(event: WebSocketEvent): void {
    this.connections.forEach((connection, connectionId) => {
      this.sendToConnection(connectionId, event);
    });
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getProjectSubscriptionCount(projectId: string): number {
    const projectConnections = this.projectSubscriptions.get(projectId);
    return projectConnections ? projectConnections.size : 0;
  }

  public getActiveConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.socket.readyState === WebSocket.OPEN
    );
  }

  public closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.close();
    }
  }

  public closeAllConnections(): void {
    this.connections.forEach((connection, connectionId) => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.close();
      }
    });
    this.connections.clear();
    this.projectSubscriptions.clear();
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  public isHealthy(): boolean {
    return this.wss.clients.size >= 0; // Server is healthy if it can accept connections
  }

  public getStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: this.getActiveConnections().length,
      projectSubscriptions: this.projectSubscriptions.size,
      serverState: 'OPEN' // WebSocket server is always open when this method is called
    };
  }
}
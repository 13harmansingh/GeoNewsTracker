import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface BiasJobUpdate {
  type: 'job_queued' | 'job_completed' | 'job_failed';
  jobId: string;
  status: string;
  result?: {
    prediction: string;
    confidence: number;
    summary: string;
  };
  error?: string;
  timestamp: number;
}

class BiasWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/bias-updates'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 WebSocket client connected');
      this.clients.add(ws);

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to bias detection updates',
        timestamp: Date.now()
      }));
    });

    console.log('🌐 WebSocket server initialized at /ws/bias-updates');
  }

  broadcast(update: BiasJobUpdate) {
    const message = JSON.stringify(update);
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error('Failed to send WebSocket message:', error);
        }
      }
    });

    if (sentCount > 0) {
      console.log(`📡 Broadcasted ${update.type} to ${sentCount} client(s): ${update.jobId}`);
    }
  }

  notifyJobQueued(jobId: string) {
    this.broadcast({
      type: 'job_queued',
      jobId,
      status: 'queued',
      timestamp: Date.now()
    });
  }

  notifyJobCompleted(jobId: string, result: { prediction: string; confidence: number; summary: string }) {
    this.broadcast({
      type: 'job_completed',
      jobId,
      status: 'completed',
      result,
      timestamp: Date.now()
    });
  }

  notifyJobFailed(jobId: string, error: string) {
    this.broadcast({
      type: 'job_failed',
      jobId,
      status: 'failed',
      error,
      timestamp: Date.now()
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const biasWebSocketServer = new BiasWebSocketServer();

/**
 * Session Manager to track player connections and sessions
 * This helps to maintain continuity when players disconnect and reconnect
 */

class SessionManager {
  constructor() {
    this.sessions = new Map(); // playerId -> { socketId, lastSeen }
  }

  /**
   * Register a player session when they connect
   * @param {string} playerId - The player's unique ID
   * @param {string} socketId - The socket connection ID
   * @returns {boolean} - True if this is a new session, false if reconnecting
   */
  registerSession(playerId, socketId) {
    const isReconnect = this.sessions.has(playerId);
    
    this.sessions.set(playerId, {
      socketId,
      lastSeen: Date.now()
    });
    
    return !isReconnect;
  }

  /**
   * Mark a player as disconnected
   * @param {string} socketId - The socket connection ID
   * @returns {string|null} - The player ID if found, null otherwise
   */
  handleDisconnect(socketId) {
    let disconnectedPlayerId = null;
    
    for (const [playerId, session] of this.sessions.entries()) {
      if (session.socketId === socketId) {
        disconnectedPlayerId = playerId;
        
        // Update last seen time but keep the session
        this.sessions.set(playerId, {
          ...session,
          lastSeen: Date.now(),
          disconnected: true
        });
        
        break;
      }
    }
    
    return disconnectedPlayerId;
  }

  /**
   * Check if a player is currently connected
   * @param {string} playerId - The player's unique ID
   * @returns {boolean} - True if connected, false otherwise
   */
  isPlayerConnected(playerId) {
    const session = this.sessions.get(playerId);
    return session && !session.disconnected;
  }

  /**
   * Get total count of connected players
   * @returns {number} - Number of connected players
   */
  getConnectedCount() {
    let count = 0;
    
    for (const session of this.sessions.values()) {
      if (!session.disconnected) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Get a player's socket ID
   * @param {string} playerId - The player's unique ID
   * @returns {string|null} - Socket ID if found, null otherwise
   */
  getPlayerSocket(playerId) {
    const session = this.sessions.get(playerId);
    return session ? session.socketId : null;
  }

  /**
   * Clean up old sessions (older than maxAge milliseconds)
   * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
   */
  cleanupOldSessions(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    
    for (const [playerId, session] of this.sessions.entries()) {
      if (session.disconnected && now - session.lastSeen > maxAge) {
        this.sessions.delete(playerId);
      }
    }
  }
}

// Create a singleton instance
const sessionManager = new SessionManager();

// Run cleanup every hour
setInterval(() => {
  sessionManager.cleanupOldSessions();
}, 60 * 60 * 1000);

module.exports = sessionManager;
// systems/log.js
const logContainer = document.getElementById("log");
const maxLogEntries = 100; // Prevent infinite growth

export function logMessage(message, type = "info") {
  const logEntry = document.createElement("div");
  logEntry.className = `log-entry log-${type}`;
  
  // Add timestamp
  const timestamp = new Date().toLocaleTimeString();
  logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
  
  // Add to log container
  logContainer.appendChild(logEntry);
  
  // Remove old entries if we have too many
  while (logContainer.children.length > maxLogEntries) {
    logContainer.removeChild(logContainer.firstChild);
  }
  
  // Auto-scroll to bottom
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Helper functions for different log types
export function logInfo(message) {
  logMessage(message, "info");
}

export function logSuccess(message) {
  logMessage(message, "success");
}

export function logWarning(message) {
  logMessage(message, "warning");
}

export function logError(message) {
  logMessage(message, "error");
}
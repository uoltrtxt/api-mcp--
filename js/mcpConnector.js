/*
 * mcpConnector.js
 *
 * This module provides a simple helper for connecting to an MCP server using
 * Server‑Sent Events (SSE).  The caller specifies the URL of the MCP
 * endpoint and supplies callback functions to handle incoming messages and
 * errors.  The function returns a closure that can be invoked to close
 * the connection when no longer needed.
 */

/**
 * Connect to an MCP server via SSE.
 *
 * @param {string} url - The MCP SSE endpoint.  For example:
 *   "http://localhost:3000/sse".
 * @param {function(string): void} onMessage - Callback invoked for each
 *   message received.  Receives the message data as a string.
 * @param {function(ErrorEvent): void} onError - Callback invoked on errors.
 * @returns {function(): void} - A function that closes the connection.
 */
export function connectToMCP(url, onMessage, onError) {
  if (!url) {
    throw new Error("MCP 서버 URL을 지정하세요.");
  }
  let eventSource;
  try {
    eventSource = new EventSource(url);
  } catch (err) {
    throw new Error(`SSE 연결 실패: ${err.message}`);
  }
  eventSource.onmessage = (event) => {
    if (onMessage) {
      onMessage(event.data);
    }
  };
  eventSource.onerror = (err) => {
    if (onError) {
      onError(err);
    }
  };
  return () => {
    if (eventSource) {
      eventSource.close();
    }
  };
}
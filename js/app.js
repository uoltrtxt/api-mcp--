/*
 * app.js
 *
 * Main controller for the CEP panel UI.  This module wires together the
 * user interface elements defined in index.html, the ChatGPT API helper
 * (chatApi.js), the MCP SSE connector (mcpConnector.js), and the host
 * ExtendScript functions exposed via CSInterface.  It uses the modern
 * ES Module syntax supported in CEP panels (Chrome engine) and runs
 * inside the panel's context.
 */

import { callChatGPT } from './chatApi.js';
import { connectToMCP } from './mcpConnector.js';

// Obtain the CSInterface object for interacting with ExtendScript
const csInterface = new CSInterface();

// Grab DOM elements
const apiKeyInput = document.getElementById('apiKeyInput');
const promptInput = document.getElementById('promptInput');
const mcpUrlInput = document.getElementById('mcpUrlInput');
const callGPTBtn = document.getElementById('callGPTBtn');
const connectMCPBtn = document.getElementById('connectMCPBtn');
const addMarkerBtn = document.getElementById('addMarkerBtn');
const outputArea = document.getElementById('outputArea');

// Keep track of the current MCP connection so we can disconnect
let closeMCPConnection = null;

/**
 * Append a line of text to the output area.  The output area uses
 * white‑space: pre‑line so newlines are honoured.
 *
 * @param {string} text
 */
function appendOutput(text) {
  outputArea.textContent += text + '\n';
  outputArea.scrollTop = outputArea.scrollHeight;
}

/**
 * Handler for ChatGPT button.  Reads API key and prompt from inputs,
 * then calls ChatGPT and prints the response or an error message.
 */
async function handleCallGPT() {
  const apiKey = apiKeyInput.value.trim();
  const prompt = promptInput.value.trim();
  if (!apiKey || !prompt) {
    alert('API 키와 프롬프트를 모두 입력하세요.');
    return;
  }
  callGPTBtn.disabled = true;
  appendOutput(`사용자: ${prompt}`);
  try {
    const reply = await callChatGPT(apiKey, prompt);
    appendOutput(`GPT: ${reply}`);
  } catch (err) {
    appendOutput(`오류: ${err.message}`);
  } finally {
    callGPTBtn.disabled = false;
  }
}

/**
 * Handler for MCP connect button.  Connects to the specified SSE URL
 * and prints incoming messages.  If already connected, closes the
 * previous connection before connecting again.
 */
function handleConnectMCP() {
  const url = mcpUrlInput.value.trim();
  if (!url) {
    alert('MCP 서버 URL을 입력하세요.');
    return;
  }
  // Close any existing connection
  if (closeMCPConnection) {
    closeMCPConnection();
    closeMCPConnection = null;
  }
  appendOutput(`MCP 서버 연결 중... (${url})`);
  try {
    closeMCPConnection = connectToMCP(url, (msg) => {
      appendOutput(`MCP: ${msg}`);
    }, (err) => {
      appendOutput(`MCP 오류: ${err.message || err}`);
    });
    appendOutput('MCP 연결 완료.');
  } catch (err) {
    appendOutput(`MCP 연결 실패: ${err.message}`);
  }
}

/**
 * Handler for Add Marker button.  Calls the ExtendScript function
 * addMarkerAtPlayhead() defined in jsx/hostscript.jsx.  Displays the
 * returned message in the output area.
 */
function handleAddMarker() {
  addMarkerBtn.disabled = true;
  // The function name must match that defined in hostscript.jsx
  csInterface.evalScript('addMarkerAtPlayhead()', (result) => {
    if (result && result !== 'undefined') {
      appendOutput(result);
    }
    addMarkerBtn.disabled = false;
  });
}

// Attach event listeners
callGPTBtn.addEventListener('click', handleCallGPT);
connectMCPBtn.addEventListener('click', handleConnectMCP);
addMarkerBtn.addEventListener('click', handleAddMarker);

// Clean up any existing SSE connection when the panel is unloaded.
window.addEventListener('beforeunload', () => {
  if (closeMCPConnection) {
    closeMCPConnection();
    closeMCPConnection = null;
  }
});
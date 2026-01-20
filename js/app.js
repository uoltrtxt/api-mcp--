/*
 * app.js
 *
 * Main controller for the CEP panel UI.  This module wires together the
 * user interface elements defined in index.html, the ChatGPT API helper
 *  * (chatApi.js), the MCP server helper, and the host
 * ExtendScript functions exposed via CSInterface and runs inside the
 * panel's context.
 */

// Obtain the CSInterface object for interacting with ExtendScript
const csInterface = typeof CSInterface !== 'undefined' ? new CSInterface() : null;

// Grab DOM elements
const apiKeyInput = document.getElementById('apiKeyInput');
const promptInput = document.getElementById('promptInput');
const includeHostInfoInput = document.getElementById('includeHostInfo');
const refreshHostInfoBtn = document.getElementById('refreshHostInfoBtn');
const openApiKeyModalBtn = document.getElementById('openApiKeyModalBtn');
const closeApiKeyModalBtn = document.getElementById('closeApiKeyModalBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const mcpServerUrl = document.getElementById('mcpServerUrl');
const startMcpServerBtn = document.getElementById('startMcpServerBtn');
const copyMcpServerBtn = document.getElementById('copyMcpServerBtn');
const mcpServerStatus = document.getElementById('mcpServerStatus');
const callGPTBtn = document.getElementById('callGPTBtn');
const addMarkerBtn = document.getElementById('addMarkerBtn');
const codeInput = document.getElementById('codeInput');
const insertLastCodeBtn = document.getElementById('insertLastCodeBtn');
const runCodeBtn = document.getElementById('runCodeBtn');
const outputArea = document.getElementById('outputArea');

// Track the MCP server lifecycle and broadcast history.
let lastGptReply = '';
let lastHostInfo = '';
let mcpServer = null;
let mcpClients = [];
let mcpHistory = [];
let mcpServerAddress = '';

const STORAGE_KEYS = {
  openaiKey: 'openai_api_key',
  includeHostInfo: 'include_host_info',
};

/**
 * Append a line of text to the output area.  The output area uses
 * white‑space: pre‑line so newlines are honoured.
 *
 * @param {string} text
 */
function appendMessage(role, text) {
  const message = document.createElement('div');
  message.classList.add('message', role);
  message.textContent = text;
  outputArea.appendChild(message);
  outputArea.scrollTop = outputArea.scrollHeight;
  emitMcpMessage({ role, text });
}

function persistField(key, value) {
  localStorage.setItem(key, value);
}

function loadPersistedFields() {
  apiKeyInput.value = localStorage.getItem(STORAGE_KEYS.openaiKey) || '';
  includeHostInfoInput.checked = localStorage.getItem(STORAGE_KEYS.includeHostInfo) === 'true';
  updateApiKeyStatus();
}

function extractCodeBlock(text) {
  const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : '';
}

function updateLastGptReply(reply) {
  lastGptReply = reply || '';
  const extracted = extractCodeBlock(lastGptReply);
  insertLastCodeBtn.disabled = !extracted;
}

function updateApiKeyStatus() {
  apiKeyStatus.textContent = apiKeyInput.value.trim() ? '설정됨' : '미설정';
}

function updateMcpServerStatus(statusText) {
  mcpServerStatus.textContent = statusText;
}

function setMcpServerUrl(url) {
  mcpServerAddress = url;
  mcpServerUrl.value = url || '';
}

function emitMcpMessage(payload) {
  if (!payload) {
    return;
  }
  const message = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...payload,
  };
  mcpHistory = [message].concat(mcpHistory).slice(0, 50);
  if (!mcpClients.length) {
    return;
  }
  const data = `data: ${JSON.stringify(message)}\n\n`;
  mcpClients.forEach((client) => {
    client.write(data);
  });
}

function startMcpServer() {
  if (mcpServer) {
    updateMcpServerStatus('실행 중');
    return;
  }
  const nodeRequire = window.cep_node && window.cep_node.require ? window.cep_node.require : null;
  if (!nodeRequire) {
    appendMessage('system', 'MCP 서버를 시작할 수 없습니다. (CEP Node 사용 불가)');
    updateMcpServerStatus('실행 실패');
    return;
  }
  const http = nodeRequire('http');
  mcpServer = http.createServer((req, res) => {
    if (req.url === '/sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('\n');
      mcpClients.push(res);
      req.on('close', () => {
        mcpClients = mcpClients.filter((client) => client !== res);
      });
      return;
    }
    if (req.url === '/snapshot') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        hostInfo: lastHostInfo,
        history: mcpHistory,
      }));
      return;
    }
    res.writeHead(404);
    res.end('Not Found');
  });
  mcpServer.listen(0, '127.0.0.1', () => {
    const address = mcpServer.address();
    const url = `http://127.0.0.1:${address.port}/sse`;
    setMcpServerUrl(url);
    updateMcpServerStatus('실행 중');
    appendMessage('system', `MCP 서버 시작됨: ${url}`);
  });
  mcpServer.on('error', (err) => {
    appendMessage('system', `MCP 서버 오류: ${err.message}`);
    updateMcpServerStatus('실행 실패');
  });
}

function copyMcpServerAddress() {
  if (!mcpServerAddress) {
    alert('MCP 서버 주소가 없습니다.');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(mcpServerAddress).then(() => {
      appendMessage('system', 'MCP 서버 주소를 복사했습니다.');
    }).catch(() => {
      appendMessage('system', '클립보드 복사에 실패했습니다.');
    });
  } else {
    mcpServerUrl.select();
    document.execCommand('copy');
    appendMessage('system', 'MCP 서버 주소를 복사했습니다.');
  }
}

function openApiKeyModal() {
  apiKeyModal.classList.add('open');
  apiKeyInput.focus();
}

function closeApiKeyModal() {
  apiKeyModal.classList.remove('open');
}

function saveApiKey() {
  persistField(STORAGE_KEYS.openaiKey, apiKeyInput.value.trim());
  updateApiKeyStatus();
  closeApiKeyModal();
}

/**
 * Handler for ChatGPT button.  Reads API key and prompt from inputs,
 * then calls ChatGPT and prints the response or an error message.
 */
async function handleCallGPT() {
  const apiKey = apiKeyInput.value.trim();
  const prompt = promptInput.value.trim();
  if (typeof callChatGPT !== 'function') {
    appendMessage('system', 'chatApi.js를 불러오지 못했습니다. 파일 경로를 확인하세요.');
    return;
  }
  if (!apiKey || !prompt) {
    alert('API 키와 프롬프트를 모두 입력하세요.');
    return;
  }
  callGPTBtn.disabled = true;
  const contextBlock = includeHostInfoInput.checked && lastHostInfo
    ? `\n\n[Adobe 프로젝트 정보]\n${lastHostInfo}`
    : '';
  const finalPrompt = `${prompt}${contextBlock}`;
  appendMessage('user', `사용자: ${prompt}`);
  if (contextBlock) {
    appendMessage('system', '프로젝트 정보를 프롬프트에 포함했습니다.');
  }
  try { const reply = await callChatGPT(apiKey, finalPrompt);
    updateLastGptReply(reply);
    appendMessage('gpt', `GPT: ${reply}`);
  } catch (err) {appendMessage('system', `오류: ${err.message}`);
} finally {
  callGPTBtn.disabled = false;
}
}

/**
 * Handler for Add Marker button.  Calls the ExtendScript function
 * addMarkerAtPlayhead() defined in jsx/hostscript.jsx.  Displays the
 * returned message in the output area.
 */
function handleAddMarker() {
    if (!csInterface) {
    appendMessage('system', 'CSInterface.js를 불러오지 못했습니다. 패널을 다시 설치하거나 경로를 확인하세요.');
    return;
  }
  addMarkerBtn.disabled = true;
  // The function name must match that defined in hostscript.jsx
  csInterface.evalScript('addMarkerAtPlayhead()', (result) => {
    if (result && result !== 'undefined') {appendMessage('system', result);
    }
    addMarkerBtn.disabled = false;
  });
}

function handleRefreshHostInfo() {
   if (!csInterface) {
    appendMessage('system', 'CSInterface.js를 불러오지 못했습니다. 패널을 다시 설치하거나 경로를 확인하세요.');
    return;
  }
  refreshHostInfoBtn.disabled = true;
  csInterface.evalScript('getHostProjectSummary()', (result) => {
    lastHostInfo = result && result !== 'undefined' ? result : '';
    if (lastHostInfo) {
      appendMessage('system', `프로젝트 정보 로드 완료.\n${lastHostInfo}`);
      emitMcpMessage({ role: 'host', text: lastHostInfo });
    } else {
      appendMessage('system', '프로젝트 정보가 없습니다.');
    }
    refreshHostInfoBtn.disabled = false;
  });
}

function handleInsertLastCode() {
  const code = extractCodeBlock(lastGptReply);
  if (code) {
    codeInput.value = code;
  } else {
    alert('GPT 응답에서 코드 블록을 찾지 못했습니다.');
  }
}

function handleRunCode() {
   if (!csInterface) {
    appendMessage('system', 'CSInterface.js를 불러오지 못했습니다. 패널을 다시 설치하거나 경로를 확인하세요.');
    return;
  }
  const code = codeInput.value.trim();
  if (!code) {
    alert('실행할 코드를 입력하세요.');
    return;
  }
  const escapedCode = code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
  runCodeBtn.disabled = true;
  csInterface.evalScript(`runDynamicExtendScript("${escapedCode}")`, (result) => {
    if (result && result !== 'undefined') {
      appendMessage('system', result);
    }
    runCodeBtn.disabled = false;
  });
}

// Attach event listeners
callGPTBtn.addEventListener('click', handleCallGPT);

addMarkerBtn.addEventListener('click', handleAddMarker);
refreshHostInfoBtn.addEventListener('click', handleRefreshHostInfo);
insertLastCodeBtn.addEventListener('click', handleInsertLastCode);
runCodeBtn.addEventListener('click', handleRunCode);
openApiKeyModalBtn.addEventListener('click', openApiKeyModal);
closeApiKeyModalBtn.addEventListener('click', closeApiKeyModal);
saveApiKeyBtn.addEventListener('click', saveApiKey);
startMcpServerBtn.addEventListener('click', startMcpServer);
copyMcpServerBtn.addEventListener('click', copyMcpServerAddress);
apiKeyModal.addEventListener('click', (event) => {
  if (event.target === apiKeyModal) {
    closeApiKeyModal();
  }
});

includeHostInfoInput.addEventListener('change', () => persistField(STORAGE_KEYS.includeHostInfo, includeHostInfoInput.checked ? 'true' : 'false'));

loadPersistedFields();
updateLastGptReply('');
startMcpServer();
// Clean up any existing server when the panel is unloaded.
window.addEventListener('beforeunload', () => {if (mcpServer) {
  mcpServer.close();
  mcpServer = null;
}
});

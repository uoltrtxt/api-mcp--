/*
 * mcpConnector.js
 *
 * SSE 기반 "연결 헬퍼".
 * 현재 index.html/app.js에서는 직접 사용하지 않지만,
 * 일반 스크립트 로딩 환경(CEP)에서도 동작하도록 ESM export를 제거했습니다.
 */

(function () {
  /**
   * Connect to an MCP server via SSE.
   *
   * @param {object} options
   * @param {string} options.url SSE endpoint URL
   * @param {function(string):void} onMessage
   * @param {function(Error):void} onError
   * @returns {function():void} close function
   */
  function connectToMCP(options, onMessage, onError) {
    if (!options || !options.url) {
      throw new Error('MCP 서버 URL을 지정하세요.');
    }

    var urlObject = new URL(options.url);
    if (options.apiKey) urlObject.searchParams.set('mcp_api_key', options.apiKey);
    if (options.accessToken) urlObject.searchParams.set('access_token', options.accessToken);
    if (options.clientId) urlObject.searchParams.set('client_id', options.clientId);

    var eventSource;
    try {
      eventSource = new EventSource(urlObject.toString());
    } catch (err) {
      throw new Error('SSE 연결 실패: ' + err.message);
    }

    eventSource.onmessage = function (event) {
      if (onMessage) onMessage(event.data);
    };

    eventSource.onerror = function (err) {
      if (onError) onError(err);
    };

    return function () {
      if (eventSource) eventSource.close();
    };
  }

  window.connectToMCP = connectToMCP;
})();

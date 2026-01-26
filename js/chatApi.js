/*
 * chatApi.js
 *
 * CEP 패널(브라우저/CEF)에서 OpenAI Chat Completions API를 호출하기 위한 헬퍼.
 *
 * IMPORTANT
 * - index.html이 <script>로 로드하는 "일반 스크립트" 방식이므로 ESM export/import를 쓰면 안 됩니다.
 * - 브라우저 fetch는 CORS에 막힐 수 있으므로, 가능하면 CEP Node( window.cep_node.require )로 호출합니다.
 */

(function () {
  /**
   * OpenAI Chat Completions 호출
   * @param {string} apiKey
   * @param {string} prompt
   * @param {string} model
   * @returns {Promise<string>}
   */
  async function callChatGPT(apiKey, prompt, model) {
    model = model || 'gpt-5-mini';

    if (!apiKey) {
      throw new Error('API 키가 필요합니다. API 키를 입력하세요.');
    }
    if (!prompt) {
      throw new Error('프롬프트가 비어 있습니다. 질문을 입력하세요.');
    }

    const payload = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that answers user questions.' },
        { role: 'user', content: prompt },
      ],
    });

    // Prefer CEP Node to avoid CORS and keep network logic out of the CEF sandbox.
    const nodeRequire = window.cep_node && window.cep_node.require ? window.cep_node.require : null;
    if (nodeRequire) {
      const https = nodeRequire('https');

      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: 'Bearer ' + apiKey,
        },
      };

      return await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode < 200 || res.statusCode >= 300) {
                // Try to parse OpenAI-style error payload
                try {
                  const errJson = JSON.parse(body || '{}');
                  const msg = errJson && errJson.error && errJson.error.message ? errJson.error.message : null;
                  return reject(new Error(msg || 'HTTP 오류: ' + res.statusCode));
                } catch (_) {
                  return reject(new Error('HTTP 오류: ' + res.statusCode));
                }
              }
              const data = JSON.parse(body || '{}');
              const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
              resolve(reply || '응답을 파싱할 수 없습니다.');
            } catch (e) {
              reject(new Error('응답 파싱 실패: ' + e.message));
            }
          });
        });

        req.on('error', (e) => reject(new Error('네트워크 오류: ' + e.message)));
        req.write(payload);
        req.end();
      });
    }

    // Fallback: CEF fetch (may fail due to CORS)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: payload,
    });

    if (!response.ok) {
      let errorText = 'HTTP 오류: ' + response.status;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error && errJson.error.message) {
          errorText = errJson.error.message;
        }
      } catch (_) {
        // ignore
      }
      throw new Error(errorText);
    }

    const data = await response.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return reply || '응답을 파싱할 수 없습니다.';
  }

  // Expose globally for app.js
  window.callChatGPT = callChatGPT;
})();

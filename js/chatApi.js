/*
 * chatApi.js
 *
 * This module provides a helper function for calling the OpenAI Chat Completion
 * API.  Given an API key and a prompt, it returns the assistant's response
 * text.  Error handling is included to throw descriptive errors when
 * something goes wrong.  To use this function you must provide your own
 * OpenAI API key.  Keep API keys secure and never hard‑code them into
 * production code.
 */

/**
 * Call the OpenAI ChatGPT API with the provided API key and prompt.
 *
 * @param {string} apiKey - An OpenAI API key.  Must be valid or the API
 *   will return an authentication error.
 * @param {string} prompt - The user's prompt that will be sent to the model.
 * @param {string} [model="gpt-4o"] - Optional model name to use.
 * @returns {Promise<string>} - Resolves with the assistant's reply text.
 */
export async function callChatGPT(apiKey, prompt, model = "gpt-4o") {
  if (!apiKey) {
    throw new Error("API 키가 필요합니다. API 키를 입력하세요.");
  }
  if (!prompt) {
    throw new Error("프롬프트가 비어 있습니다. 질문을 입력하세요.");
  }
  // Construct the request payload for the Chat Completion API
  const payload = {
    model: model,
    messages: [
      { role: "system", content: "You are a helpful assistant that answers user questions." },
      { role: "user", content: prompt }
    ]
  };
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      // Attempt to extract error information from the response body
      let errorText = `HTTP 오류: ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error && errJson.error.message) {
          errorText = errJson.error.message;
        }
      } catch (jsonErr) {
        // ignore
      }
      throw new Error(errorText);
    }
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    return reply || "응답을 파싱할 수 없습니다.";
  } catch (err) {
    // Re‑throw any network or parsing errors with a user‑friendly message
    throw new Error(`ChatGPT 호출 실패: ${err.message}`);
  }
}
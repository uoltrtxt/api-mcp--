// js/chatApi.js
async function callChatGPT(prompt) {
  // API 키를 안전하게 주입하세요. 예: CEP의 사용자 설정에서 읽기
  const apiKey = window.OPENAI_API_KEY || "";  // 실제 프로젝트에서는 플러그인 설정 등을 통해 공급
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "ChatGPT 호출 실패");
  }
  return data.choices[0].message.content;
}

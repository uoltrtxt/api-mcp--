This folder contains a CEP extension that integrates both ChatGPT API calls and MCP server connectivity.

Files:
- CSXS/manifest.xml: CEP manifest describing the extension. Edit the ExtensionBundleId and Extension Id to suit your organisation.
- html/index.html: UI layout with input fields for API key, prompt and MCP URL.
- js/chatApi.js: Helper for calling the OpenAI Chat Completion API.
- js/mcpConnector.js: Helper for connecting to an MCP server via Server-Sent Events.
- js/app.js: Main JavaScript that wires up UI events, calls the ChatGPT API, connects to the MCP server and interacts with ExtendScript.
- jsx/hostscript.jsx: ExtendScript that adds a marker at the current playhead position for Premiere Pro or After Effects.

Important:
- The file js/CSInterface.js is not included due to licensing restrictions. Copy it from Adobe's CEP-Resources (CEP12x/js folder) into the js directory before installation.
- To install this extension in Adobe applications, copy the MyMCPChatPlugin folder into the Adobe CEP extensions directory (see README provided in the chat for details) and enable PlayerDebugMode in the registry.

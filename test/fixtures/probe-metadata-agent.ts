import { Readable, Writable } from "node:stream";
import {
  AgentSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type Agent,
} from "@agentclientprotocol/sdk";

const agent: Agent = {
  async initialize() {
    if (process.argv.includes("--minimal")) {
      return { protocolVersion: PROTOCOL_VERSION };
    }
    return {
      protocolVersion: PROTOCOL_VERSION,
      agentInfo: {
        name: "probe-fixture",
        title: "Probe Fixture",
        version: "1.2.3",
        _meta: { fixture: { build: 17 } },
      },
      agentCapabilities: {
        loadSession: true,
        promptCapabilities: { image: true, audio: false, embeddedContext: true },
        mcpCapabilities: { http: true, sse: false },
        sessionCapabilities: { list: {}, close: {} },
        _meta: { fixture: { capability: "custom" } },
      },
      authMethods: [
        {
          id: "fixture-oauth",
          name: "Sign in",
          description: "Use the cached account",
          _meta: { fixture: { provider: "test" } },
        },
      ],
    };
  },
  async authenticate() {
    throw new Error("Metadata fixture must use its cached account");
  },
  async newSession() {
    return { sessionId: "metadata-probe-session" };
  },
  async prompt() {
    throw new Error("Metadata inspection must not send a prompt");
  },
  async cancel() {},
};

const connection = new AgentSideConnection(
  () => agent,
  ndJsonStream(
    Writable.toWeb(process.stdout) as WritableStream<Uint8Array>,
    Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>,
  ),
);
await connection.closed;

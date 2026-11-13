import type { Command } from "commander";
import { InterruptedError } from "../async-control.js";
import type { AgentProbeResult } from "../runtime/public/probe.js";
import type { OutputFormat } from "../types.js";
import type { ResolvedAcpxConfig } from "./config.js";
import { resolveAgentInvocation, resolveGlobalFlags, resolveOutputPolicy } from "./flags.js";
import { emitJsonResult } from "./output/json-output.js";

function probeMetadata(result: AgentProbeResult) {
  return {
    agentInfo: result.agentInfo ?? null,
    protocolVersion: result.protocolVersion,
    agentCapabilities: result.agentCapabilities ?? null,
    authMethods: result.authMethods ?? null,
  };
}

function printProbeResult(agent: string, result: AgentProbeResult, format: OutputFormat): void {
  if (
    emitJsonResult(format, {
      action: "probe",
      agent,
      ...probeMetadata(result),
      models: result.models ?? null,
    })
  ) {
    return;
  }
  if (format === "quiet") {
    for (const modelId of result.models?.availableModelIds ?? []) {
      process.stdout.write(`${modelId}\n`);
    }
    return;
  }
  printTextProbeResult(result);
}

function printTextProbeResult(result: AgentProbeResult): void {
  for (const [key, value] of Object.entries(probeMetadata(result))) {
    process.stdout.write(`${key}: ${JSON.stringify(value)}\n`);
  }
  const { models } = result;
  if (!models) {
    process.stdout.write("No model catalog advertised\n");
    return;
  }
  process.stdout.write(`model: ${models.currentModelId ?? "-"}\navailableModels:\n`);
  for (const model of models.availableModels ?? []) {
    process.stdout.write(`  ${model.modelId}\t${model.name}\n`);
  }
}

async function handleProbe(
  explicitAgentName: string | undefined,
  command: Command,
  config: ResolvedAcpxConfig,
): Promise<void> {
  const flags = resolveGlobalFlags(command, config);
  const agent = resolveAgentInvocation(explicitAgentName, flags, config);
  const outputPolicy = resolveOutputPolicy(flags.format, flags.jsonStrict === true);
  const controller = new AbortController();
  const onInterrupt = () => controller.abort(new InterruptedError());
  const signals = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
  for (const signal of signals) {
    process.on(signal, onInterrupt);
  }
  try {
    const { inspectAgent } = await import("../runtime/public/probe.js");
    const result = await inspectAgent({
      agentCommand: agent.agentArgv ?? agent.agentCommand,
      cwd: agent.cwd,
      timeoutMs: flags.timeout,
      signal: controller.signal,
      authCredentials: config.auth,
      authPolicy: flags.authPolicy,
      verbose: flags.verbose,
      suppressSdkConsoleErrors: outputPolicy.suppressSdkConsoleErrors,
    });
    controller.signal.throwIfAborted();
    printProbeResult(agent.agentName, result, flags.format);
  } finally {
    for (const signal of signals) {
      process.off(signal, onInterrupt);
    }
  }
}

export function registerProbeCommand(
  parent: Command,
  explicitAgentName: string | undefined,
  config: ResolvedAcpxConfig,
): void {
  parent
    .command("probe")
    .description("Discover agent metadata and available models without sending a prompt")
    .action(async function (this: Command) {
      await handleProbe(explicitAgentName, this, config);
    });
}

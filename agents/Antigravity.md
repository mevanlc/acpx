# Antigravity

`acpx antigravity` launches Antigravity CLI's native ACP server with `agy acp`.
The server speaks ACP over stdio and uses the CLI's cached sign-in, settings,
tools, and models. See [Google's ACP guide](https://antigravity.google/docs/cli/acp/).

## Installation and account setup

Install Antigravity CLI and put `agy` on `PATH`. Verify that the installed
version includes ACP support:

```bash
agy acp --help
```

Sign in once with an interactive `agy` session or run `agy acp --login`, then
retry acpx. The built-in profile requires no separate `agy_acp_server.par`
download or `ANTIGRAVITY_HARNESS_PATH` setting. acpx does not install or update
Antigravity CLI.

## Sessions and models

```bash
acpx --format json antigravity probe
acpx antigravity sessions new --name work
acpx antigravity -s work set model <advertised-model-id>
acpx antigravity -s work 'Summarize this workspace'
```

Available models depend on the signed-in account. Use the exact model IDs
advertised in the session configuration; do not infer them from another Google
client or silently substitute an unavailable model. acpx uses its existing ACP
session reconnect and model configuration support.

`probe` also reports the server's identity and version, negotiated ACP version,
capabilities, and advertised authentication methods. Authentication methods do
not establish login status. See [`probe`](../docs/CLI.md#probe-command) for the
output fields.

## Standalone ACP runtime

Earlier acpx versions defaulted to the separately downloaded
`agy_acp_server.par` runtime (`agy_acp_server.exe` on Windows). It has its own
account profile and native session storage. Saved standalone sessions keep their
original launch identity and are not moved to `agy acp`.

To keep using that runtime, configure an explicit agent command. For example,
on macOS:

```json
{
  "agents": {
    "antigravity": { "argv": ["/absolute/path/to/agy_acp_server.par"] }
  }
}
```

Use the exact command and arguments previously used for a saved session to keep
its acpx scope. Linux's standalone command includes `--uid=`. Windows uses
`agy_acp_server.exe`.

Download the matching runtime and `localharness_external` helper from the
[official ACP registry](https://github.com/agentclientprotocol/registry/blob/main/antigravity-acp/agent.json).
Set `ANTIGRAVITY_HARNESS_PATH` to the absolute helper path
(`localharness_external.exe` on Windows). Make the files executable on Linux/macOS.

The standalone profile is rooted at `GEMINI_HOME` (default `~/.gemini`). Complete
sign-in through an interactive ACP client. For personal OAuth, set
`auth.type` to `oauth-personal` in
`<GEMINI_HOME>/antigravity-acp/settings.json`; no dummy acpx credential is needed.
Keep the same profile and credential-storage configuration used during sign-in.
`AGY_ACP_FORCE_FILE_STORAGE=1` selects profile-local credential storage.

### Standalone user questions

The standalone runtime sends fixed-choice user questions through `session/request_permission`
with an `interaction_` tool-call ID. Their options represent answers, not tool
approvals. acpx cancels these requests and reports that a user answer is required,
including under `--approve-all` or an embedding host's permission handler.
This also applies to existing custom launchers when the runtime identifies itself
as `antigravity-acp`; it is not limited to the named shortcut.
Continue those conversations in a client supporting Antigravity questions.
Ordinary tool permissions still follow acpx's permission policy.

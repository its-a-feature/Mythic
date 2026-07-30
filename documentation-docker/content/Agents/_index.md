+++
title = "Agents"
chapter = false
weight = 5
+++

## Agent Documentation

This section aims to be an in-depth way to reference documentation about specific agents. Each agent has the following breakdown:

### Overview

This is a high level overview of the agent, interesting features to note about it, authors, and special thanks.

### OPSEC

This is an overview of operational security considerations related to the agent.

### Commands

This section breaks down each command, gives information about parameters, example usages, and any specific interesting details about it.

### Development

This section goes into the ideal development environment and information about how to add/modify commands and c2 profiles.

### C2 Profiles

This section goes into the different c2 profiles the agent supports and any details about the agent's specific implementation

{{% children  %}}

## File editor response protocol

Commands that advertise `task_response:file_editor` can keep a task open while an operator edits a UTF-8 file of up to 2 MB from task output. This renderer uses the existing top-level `interactive` and file-transfer fields; edited bytes are staged with the normal task-file upload flow and are never placed in interactive task parameters.

Existing interactive values 0–24 retain their terminal meanings, and 25–99 remain reserved and invalid. File editor messages use an independent range:

| Value | Direction | Meaning |
| --- | --- | --- |
| 100 | Mythic to agent | `FileEditorRequest` |
| 101 | Agent to Mythic | `FileEditorResponse` |
| 102 | Agent to Mythic | `FileEditorError` |

To open the editor, the agent transfers the current file with the normal download flow, then sends type 101 with `{"file_id":"mythic-agent-file-id"}`. The parent task remains running.

For a save, the UI stages the edited contents and creates a type 100 interactive child of the editor task:

```json
{
  "action":"save",
  "request_id":"unique-request-id",
  "file_id":"staged-agent-file-id",
  "expected_sha1":"sha1-from-the-open-snapshot"
}
```

The agent checks the current SHA-1 before and after fetching the staged file, validates its size and UTF-8 encoding, and atomically replaces the target. It reads the file back, verifies that its SHA-1 matches the staged bytes, and sends type 101 with the same `request_id`, the staged `file_id`, and `current_sha1`. The type-100 child upload is associated with the long-running parent task so the agent fetches the original upload row without creating a tracked copy. Type-101 file IDs are authoritative versions and may refer to either uploads or agent downloads.

If read-back verification fails, the agent sends type 102 with `code` set to `write_verification_failed`. The staged upload remains available for inspection or retry.

On a hash mismatch, the agent sends type 102 with `code` set to `conflict`, the `request_id`, staged `file_id`, `expected_sha1`, `current_sha1`, and a user-facing `message`. Echoing the staged file ID lets the UI retain **Save anyway** across renderer remounts and show a read-only preview of the exact staged upload before the operator forces it. Save anyway uses a new request ID and explicitly adds `"force_overwrite":true`; agents must never infer force overwrite from a missing or mismatched hash.

A refresh is a type 100 request with `action` set to `refresh` and a new `request_id`; refreshes continue to create agent-download snapshots. Every type-101 version is retained as a read-only history entry that the operator can cycle through; only the latest version is editable. Staged uploads should use a file comment that clearly identifies them as file edits.

When the operator selects **Done**, the UI sends a type-100 request with `action` set to `close`. The agent completes the parent task, and the UI leaves the snapshot history available in read-only mode.

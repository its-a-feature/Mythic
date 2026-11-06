# Interactive byte streams

RDP and VNC use the existing top-level `interactive` agent-message field. The
command's `supported_ui_features` fixes the protocol for the lifetime of its
task:

- `task_response:interactive` defaults to `terminal` for compatibility.
- `task_response:interactive:terminal` selects a terminal explicitly.
- `task_response:interactive:rdp` selects an RDP byte stream.
- `task_response:interactive:vnc` selects a VNC byte stream.

The browser and agent packets do not select or repeat the protocol. Conflicting
or unknown protocol features are rejected.

The task UUID is the stream identity. There is no additional stream ID, and a
task has at most one binary stream.

```json
{
  "task_id": "task-uuid",
  "message_type": 200,
  "offset": 65536,
  "data": "base64 bytes"
}
```

Byte-stream `MessageType` values are:

- `200` (`StreamData`): carries base64-encoded opaque bytes at an absolute byte
  `offset`.
- `201` (`StreamWindow`): acknowledges all bytes below `ack` and advertises how many bytes
  may be sent beyond that offset.
- `202` (`StreamClose`): cleanly ends the task stream after already-queued bytes are drained.
- `203` (`StreamReset`): immediately aborts a corrupt or unusable stream; `reason` is for
  diagnostics.

There is no separate open record. Registering the task stream sends an initial
`StreamWindow`, which both establishes flow-control credit and is safe to queue
until the agent next checks in.

For RDP/VNC tasks, the agent's first `StreamWindow` lazily creates the backend
stream and a private, one-connection TCP relay. guacd connects its protocol
plugin to that relay, while the relay passes the opaque RDP/VNC bytes to and
from the agent stream. The final target host and port remain agent-side BOF
arguments and are never given to guacd.

The RDP command's normal `Username` and `Password` parameters are read from the
task's immutable `mythic_parsed_params` and supplied only in guacd's initial
`connect` arguments. They are not placed in the BOF argument buffer or in any
interactive byte-stream record.

A sender may transmit only data whose ending offset is at or below
`ack + window`. Offsets are monotonically increasing. Whole-chunk retries are
ignored, while gaps and partial overlaps reset the stream because RDP/VNC are
ordered TCP byte streams and cannot tolerate missing bytes.

The Mythic stream and its guacd primary user are task-owned. Browser users join
guacd's internal connection ID and may come and go without closing either the
agent stream or the recording. An explicit stream close/reset, guacd failure,
or eventual task completion ends the task-owned session.

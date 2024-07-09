package databaseStructs

import (
	"time"

	"github.com/its-a-feature/Mythic/utils/structs"
)

type Filemeta struct {
	ID                  int               `db:"id" json:"id" mapstructure:"id"`
	AgentFileID         string            `db:"agent_file_id" json:"agent_file_id" mapstructure:"agent_file_id"`
	TotalChunks         int               `db:"total_chunks" json:"total_chunks" mapstructure:"total_chunks"`
	ChunksReceived      int               `db:"chunks_received" json:"chunks_received" mapstructure:"chunks_received"`
	ChunkSize           int               `db:"chunk_size" json:"chunk_size" mapstructure:"chunk_size"`
	TaskID              structs.NullInt64 `db:"task_id" json:"task_id,omitempty" mapstructure:"task_id"`
	Task                *Task             `db:"task" json:"-" mapstructure:"task"`
	Complete            bool              `db:"complete" json:"complete" mapstructure:"complete"`
	Path                string            `db:"path" json:"path" mapstructure:"path"`
	FullRemotePath      []byte            `db:"full_remote_path" json:"full_remote_path" mapstructure:"full_remote_path"`
	Host                string            `db:"host" json:"host" mapstructure:"host"`
	IsPayload           bool              `db:"is_payload" json:"is_payload" mapstructure:"is_payload"`
	IsScreenshot        bool              `db:"is_screenshot" json:"is_screenshot" mapstructure:"is_screenshot"`
	IsDownloadFromAgent bool              `db:"is_download_from_agent" json:"is_download_from_agent" mapstructure:"is_download_from_agent"`
	MythicTreeID        structs.NullInt64 `db:"mythictree_id" json:"mythictree_id,omitempty" mapstructure:"mythictree_id"`
	Filename            []byte            `db:"filename" json:"filename" mapstructure:"filename"`
	DeleteAfterFetch    bool              `db:"delete_after_fetch" json:"delete_after_fetch" mapstructure:"delete_after_fetch"`
	OperationID         int               `db:"operation_id" json:"operation_id" mapstructure:"operation_id"`
	Operation           Operation         `db:"operation" json:"-"`
	Timestamp           time.Time         `db:"timestamp" json:"timestamp" mapstructure:"timestamp"`
	Deleted             bool              `db:"deleted" json:"deleted" mapstructure:"deleted"`
	OperatorID          int               `db:"operator_id" json:"operator_id" mapstructure:"operator_id"`
	Operator            Operator          `db:"operator" json:"-"`
	Md5                 string            `db:"md5" json:"md5" mapstructure:"md5"`
	Sha1                string            `db:"sha1" json:"sha1" mapstructure:"sha1"`
	Comment             string            `db:"comment" json:"comment" mapstructure:"comment"`
	Size                int64             `db:"size" json:"size" mapstructure:"size"`
	EventGroupID        structs.NullInt64 `db:"eventgroup_id" json:"eventgroup_id" mapstructure:"eventgroup_id"`
	EventStepInstanceID structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	APITokensID         structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}

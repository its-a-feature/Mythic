package rabbitmq

import (
	"database/sql"
	"testing"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestDedupeMythicTreeNodesMergesRepeatedKeys(t *testing.T) {
	first := &databaseStructs.MythicTree{
		Host:            "HOST",
		OperationID:     1,
		FullPath:        []byte("C:\\Windows"),
		ParentPath:      []byte("C:"),
		Name:            []byte("Windows"),
		TreeType:        databaseStructs.TREE_TYPE_FILE,
		CanHaveChildren: true,
		HasChildren:     true,
		Metadata:        GetMythicJSONTextFromStruct(map[string]interface{}{"first": "value", "replace": "old"}),
	}
	first.CallbackID.Valid = true
	first.CallbackID.Int64 = 10
	second := &databaseStructs.MythicTree{
		Host:        "HOST",
		OperationID: 1,
		FullPath:    []byte("C:\\Windows"),
		ParentPath:  []byte("C:"),
		Name:        []byte("Windows"),
		TreeType:    databaseStructs.TREE_TYPE_FILE,
		Success:     sql.NullBool{Valid: true, Bool: true},
		Metadata:    GetMythicJSONTextFromStruct(map[string]interface{}{"second": "value", "replace": "new"}),
	}
	second.CallbackID.Valid = true
	second.CallbackID.Int64 = 10

	deduped := dedupeMythicTreeNodes([]*databaseStructs.MythicTree{first, second})
	if len(deduped) != 1 {
		t.Fatalf("expected one deduped MythicTree node, got %d", len(deduped))
	}
	if !deduped[0].CanHaveChildren {
		t.Fatalf("expected can_have_children to preserve prior child state")
	}
	if !deduped[0].HasChildren {
		t.Fatalf("expected has_children to preserve prior child state")
	}
	if !deduped[0].Success.Valid || !deduped[0].Success.Bool {
		t.Fatalf("expected success to merge with SQL OR semantics, got %#v", deduped[0].Success)
	}
	metadata := deduped[0].Metadata.StructValue()
	if metadata["first"] != "value" || metadata["second"] != "value" || metadata["replace"] != "new" {
		t.Fatalf("unexpected merged metadata: %#v", metadata)
	}
}

func TestNormalizeMythicTreeNodeForUpsertDefaultsDisplayPathToName(t *testing.T) {
	node := &databaseStructs.MythicTree{
		Name: []byte("poseidon"),
	}

	if err := normalizeMythicTreeNodeForUpsert(node); err != nil {
		t.Fatalf("expected display path normalization to succeed: %v", err)
	}
	if string(node.DisplayPath) != "poseidon" {
		t.Fatalf("expected display path to default to name, got %q", string(node.DisplayPath))
	}
}

func TestNormalizeMythicTreeNodeForUpsertKeepsProvidedDisplayPath(t *testing.T) {
	node := &databaseStructs.MythicTree{
		Name:        []byte("poseidon"),
		DisplayPath: []byte("Poseidon"),
	}

	if err := normalizeMythicTreeNodeForUpsert(node); err != nil {
		t.Fatalf("expected display path normalization to succeed: %v", err)
	}
	if string(node.DisplayPath) != "Poseidon" {
		t.Fatalf("expected provided display path to be preserved, got %q", string(node.DisplayPath))
	}
}

func TestNormalizeMythicTreeNodesForBatchSkipsInvalidEntries(t *testing.T) {
	valid := &databaseStructs.MythicTree{Name: []byte("valid")}
	invalid := &databaseStructs.MythicTree{FullPath: []byte("/tmp/invalid")}

	normalized := normalizeMythicTreeNodesForBatch([]*databaseStructs.MythicTree{nil, invalid, valid})
	if len(normalized) != 1 {
		t.Fatalf("expected only the valid node to remain, got %d nodes", len(normalized))
	}
	if normalized[0] != valid {
		t.Fatalf("expected the valid node to be preserved")
	}
	if string(normalized[0].DisplayPath) != "valid" {
		t.Fatalf("expected display path to default during batch normalization, got %q", string(normalized[0].DisplayPath))
	}
}

func TestNormalizeMythicTreeNodeForUpsertKeepsEmptyParentPathNonNil(t *testing.T) {
	node := &databaseStructs.MythicTree{
		Name:       []byte("/"),
		FullPath:   []byte("/"),
		ParentPath: []byte{},
	}

	if err := normalizeMythicTreeNodeForUpsert(node); err != nil {
		t.Fatalf("expected root node normalization to succeed: %v", err)
	}
	if node.ParentPath == nil {
		t.Fatalf("expected empty parent path to remain non-nil for database bytea writes")
	}
	if len(node.ParentPath) != 0 {
		t.Fatalf("expected empty parent path, got %q", string(node.ParentPath))
	}
}

func TestBuildFileBrowserChildMythicTreeNodeDoesNotAliasSiblingFullPaths(t *testing.T) {
	task := databaseStructs.Task{
		ID:          5,
		OperationID: 6,
	}
	task.Callback.ID = 7
	parentPath := make([]byte, len("/tmp/listing"), len("/tmp/listing")+64)
	copy(parentPath, "/tmp/listing")

	first := buildFileBrowserChildMythicTreeNode(task, "HOST", parentPath, "/", agentMessagePostResponseFileBrowserChildren{Name: "alpha"}, "linux", 0)
	second := buildFileBrowserChildMythicTreeNode(task, "HOST", parentPath, "/", agentMessagePostResponseFileBrowserChildren{Name: "bravo"}, "linux", 0)

	if string(first.FullPath) != "/tmp/listing/alpha" {
		t.Fatalf("expected first child full path to remain tied to its name, got %q", string(first.FullPath))
	}
	if string(second.FullPath) != "/tmp/listing/bravo" {
		t.Fatalf("expected second child full path to match its name, got %q", string(second.FullPath))
	}
	if string(parentPath) != "/tmp/listing" {
		t.Fatalf("expected parent path to remain unchanged, got %q", string(parentPath))
	}
}

func TestBuildCustomBrowserChildMythicTreeNodePreservesDisplayPath(t *testing.T) {
	task := databaseStructs.Task{
		ID:          5,
		OperationID: 6,
	}
	task.Callback.ID = 7

	child := agentMessagePostResponseCustomBrowserChildren{
		Name:            "123",
		DisplayPath:     "sshd",
		CanHaveChildren: true,
		Metadata:        map[string]interface{}{"name": "sshd"},
	}
	node := buildCustomBrowserChildMythicTreeNode(task, "HOST", []byte("/processes"), "/", databaseStructs.TREE_TYPE_FILE, child, "linux", 0)

	if string(node.FullPath) != "/processes/123" {
		t.Fatalf("expected custom child full path to include its name, got %q", string(node.FullPath))
	}
	if string(node.DisplayPath) != "sshd" {
		t.Fatalf("expected custom child display path to be preserved, got %q", string(node.DisplayPath))
	}
	if !node.CanHaveChildren {
		t.Fatalf("expected custom child can_have_children to be preserved")
	}
	if node.Metadata.StructValue()["name"] != "sshd" {
		t.Fatalf("expected custom child metadata to be preserved, got %#v", node.Metadata.StructValue())
	}
}

func TestCustomBrowserChildrenByNameUsesLastDuplicate(t *testing.T) {
	children := []agentMessagePostResponseCustomBrowserChildren{
		{Name: "alpha", DisplayPath: "old"},
		{Name: "alpha", DisplayPath: "new"},
		{Name: "bravo", DisplayPath: "bravo"},
	}

	childrenByName := customBrowserChildrenByName(&children)

	if len(childrenByName) != 2 {
		t.Fatalf("expected duplicate custom child names to collapse to two entries, got %d", len(childrenByName))
	}
	if string(childrenByName["alpha"].DisplayPath) != "new" {
		t.Fatalf("expected duplicate custom child to keep last display path, got %q", string(childrenByName["alpha"].DisplayPath))
	}
}

func TestMythicTreeDescendantParentPathPrefixIsSeparatorAware(t *testing.T) {
	if prefix := getMythicTreeDescendantParentPathPrefix([]byte("/tmp/foo"), "/"); string(prefix) != "/tmp/foo/" {
		t.Fatalf("expected slash descendant prefix to include separator, got %q", string(prefix))
	}
	if prefix := getMythicTreeDescendantParentPathPrefix([]byte("/tmp/foo/"), "/"); string(prefix) != "/tmp/foo/" {
		t.Fatalf("expected existing trailing separator to be preserved, got %q", string(prefix))
	}
	if prefix := getMythicTreeDescendantParentPathPrefix([]byte(`C:\Windows`), `\`); string(prefix) != `C:\Windows\` {
		t.Fatalf("expected windows descendant prefix to include separator, got %q", string(prefix))
	}
	if prefix := getMythicTreeDescendantParentPathPrefix([]byte(`/tmp/100%_literal`), `/`); string(prefix) != `/tmp/100%_literal/` {
		t.Fatalf("expected SQL wildcard bytes to remain literal, got %q", string(prefix))
	}
}

func TestDedupeMythicTreeCascadeDeleteTargets(t *testing.T) {
	targets := []mythicTreeCascadeDeleteTarget{
		{Host: "HOST", OperationID: 1, TreeType: databaseStructs.TREE_TYPE_FILE, CallbackID: 2, CallbackIDValid: true, FullPath: []byte("/tmp/alpha"), PathSeparator: "/"},
		{Host: "HOST", OperationID: 1, TreeType: databaseStructs.TREE_TYPE_FILE, CallbackID: 2, CallbackIDValid: true, FullPath: []byte("/tmp/alpha"), PathSeparator: "/"},
		{Host: "HOST", OperationID: 1, TreeType: databaseStructs.TREE_TYPE_FILE, CallbackID: 3, CallbackIDValid: true, FullPath: []byte("/tmp/alpha"), PathSeparator: "/"},
	}

	deduped := dedupeMythicTreeCascadeDeleteTargets(targets)

	if len(deduped) != 2 {
		t.Fatalf("expected duplicate cascade targets to collapse to two entries, got %d", len(deduped))
	}
	targets[0].FullPath[0] = 'X'
	if string(deduped[0].FullPath) != "/tmp/alpha" {
		t.Fatalf("expected deduped cascade target to own its full path bytes, got %q", string(deduped[0].FullPath))
	}
}

func TestGroupFileBrowserUpdateDeletedEntriesMergesChunksForSameDirectory(t *testing.T) {
	task := databaseStructs.Task{}
	task.Callback.Host = "HOST"
	firstChildren := []agentMessagePostResponseFileBrowserChildren{{Name: "alpha"}}
	secondChildren := []agentMessagePostResponseFileBrowserChildren{{Name: "bravo"}}

	groups, err := groupFileBrowserUpdateDeletedEntries(&task, []*agentMessagePostResponseFileBrowser{
		{ParentPath: "/tmp", Name: "listing", Files: &firstChildren},
		{ParentPath: "/tmp", Name: "listing", Files: &secondChildren},
	})
	if err != nil {
		t.Fatalf("expected grouping to succeed: %v", err)
	}
	if len(groups) != 1 {
		t.Fatalf("expected chunks for the same directory to merge into one group, got %d", len(groups))
	}
	if _, ok := groups[0].ChildrenByName["alpha"]; !ok {
		t.Fatalf("expected first chunk child to be present")
	}
	if _, ok := groups[0].ChildrenByName["bravo"]; !ok {
		t.Fatalf("expected second chunk child to be present")
	}
}

func TestGroupFileBrowserUpdateDeletedEntriesSeparatesDifferentDirectories(t *testing.T) {
	task := databaseStructs.Task{}
	task.Callback.Host = "HOST"
	firstChildren := []agentMessagePostResponseFileBrowserChildren{{Name: "alpha"}}
	secondChildren := []agentMessagePostResponseFileBrowserChildren{{Name: "bravo"}}

	groups, err := groupFileBrowserUpdateDeletedEntries(&task, []*agentMessagePostResponseFileBrowser{
		{ParentPath: "/tmp", Name: "first", Files: &firstChildren},
		{ParentPath: "/tmp", Name: "second", Files: &secondChildren},
	})
	if err != nil {
		t.Fatalf("expected grouping to succeed: %v", err)
	}
	if len(groups) != 2 {
		t.Fatalf("expected different directories to remain separate, got %d groups", len(groups))
	}
	if string(groups[0].FullPath) == string(groups[1].FullPath) {
		t.Fatalf("expected different directories to have different full paths")
	}
	if _, ok := groups[0].ChildrenByName["bravo"]; ok {
		t.Fatalf("did not expect first directory to include second directory's child")
	}
	if _, ok := groups[1].ChildrenByName["alpha"]; ok {
		t.Fatalf("did not expect second directory to include first directory's child")
	}
}

func TestBuildProcessMythicTreeNodeNormalizesProcessData(t *testing.T) {
	task := databaseStructs.Task{
		ID:          5,
		OperationID: 6,
	}
	task.Callback.ID = 7
	task.Callback.Payload.Os = "linux"
	process := agentMessagePostResponseProcesses{
		ProcessID:       123,
		ParentProcessID: 1,
	}

	node := buildProcessMythicTreeNode(task, "HOST", process, 0)
	if string(node.Name) != "unknown" {
		t.Fatalf("expected empty process name to normalize to unknown, got %q", string(node.Name))
	}
	if string(node.FullPath) != "123" {
		t.Fatalf("expected process full path to be pid, got %q", string(node.FullPath))
	}
	if string(node.ParentPath) != "1" {
		t.Fatalf("expected process parent path to be parent pid, got %q", string(node.ParentPath))
	}
	if !node.CallbackID.Valid || node.CallbackID.Int64 != 7 {
		t.Fatalf("expected callback id 7, got %#v", node.CallbackID)
	}
	if node.Os != "linux" {
		t.Fatalf("expected process OS to default from callback payload, got %q", node.Os)
	}
}

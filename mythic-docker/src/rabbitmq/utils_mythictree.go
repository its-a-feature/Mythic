package rabbitmq

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

// MythicTree ingest can happen on busy callback paths for file browser,
// process, and custom browser data. Keep the shared helpers here so the
// message handlers can focus on request-specific normalization while this file
// owns the DB write shape, duplicate handling, and process node construction.

// upsertMythicTreeNodeQuery mirrors the previous single-row createTreeNode
// behavior. It intentionally preserves metadata merge and bool-OR semantics so
// batching rows does not change what an ON CONFLICT update means.
const upsertMythicTreeNodeQuery = `INSERT INTO mythictree
	(host, task_id, operation_id, "name", full_path, parent_path, tree_type, can_have_children, success, metadata, os, callback_id, apitokens_id, has_children, display_path)
	VALUES
	(:host, :task_id, :operation_id, :name, :full_path, :parent_path, :tree_type, :can_have_children, :success, :metadata, :os, :callback_id, :apitokens_id, :has_children, :display_path)
	ON CONFLICT (host, operation_id, full_path, tree_type, callback_id)
	DO UPDATE SET
	task_id=:task_id, "name"=:name, parent_path=:parent_path,
	    can_have_children=(mythictree.has_children OR :has_children OR :can_have_children),
	    has_children=(mythictree.has_children OR :has_children),
	    metadata=mythictree.metadata || :metadata, os=:os, "timestamp"=now(), deleted=false, display_path=:display_path,
	    success=(mythictree.success OR :success)
	    RETURNING id`

// mythicTreeNodeKey represents the database uniqueness key used by the
// MythicTree upsert. The callback validity flag is included so an invalid
// callback id cannot accidentally collapse with callback_id=0.
type mythicTreeNodeKey struct {
	Host          string
	OperationID   int
	FullPath      string
	TreeType      string
	CallbackID    int64
	CallbackValid bool
}

type fileBrowserUpdateDeletedGroup struct {
	PathData       utils.AnalyzedPath
	FullPath       []byte
	ChildrenByName map[string]agentMessagePostResponseFileBrowserChildren
}

// upsertMythicTreeNode is the compatibility wrapper for callers that still need
// the created/updated ID immediately, such as filemeta association.
func upsertMythicTreeNode(treeNode *databaseStructs.MythicTree) error {
	if treeNode == nil {
		return nil
	}
	if err := normalizeMythicTreeNodeForUpsert(treeNode); err != nil {
		return err
	}
	statement, err := database.DB.PrepareNamed(upsertMythicTreeNodeQuery)
	if err != nil {
		return err
	}
	defer statement.Close()
	if err = statement.Get(&treeNode.ID, treeNode); err != nil {
		return fmt.Errorf("failed to create or update MythicTree entry %q: %w", string(treeNode.FullPath), err)
	}
	return nil
}

// upsertMythicTreeNodes writes a batch of MythicTree nodes through one
// transaction and one prepared statement. This avoids per-node prepare/autocommit
// overhead while keeping RETURNING id behavior for every node in the batch.
func upsertMythicTreeNodes(treeNodes []*databaseStructs.MythicTree) error {
	treeNodes = normalizeMythicTreeNodesForBatch(treeNodes)
	treeNodes = dedupeMythicTreeNodes(treeNodes)
	if len(treeNodes) == 0 {
		return nil
	}
	transaction, err := database.DB.Beginx()
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = transaction.Rollback()
		}
	}()
	statement, err := transaction.PrepareNamed(upsertMythicTreeNodeQuery)
	if err != nil {
		return err
	}
	defer statement.Close()
	for _, treeNode := range treeNodes {
		if err = statement.Get(&treeNode.ID, treeNode); err != nil {
			return fmt.Errorf("failed to create or update MythicTree entry %q: %w", string(treeNode.FullPath), err)
		}
	}
	if err = transaction.Commit(); err != nil {
		return err
	}
	committed = true
	return nil
}

// normalizeMythicTreeNodesForBatch applies required-field defaults while
// preserving the old per-row behavior for invalid entries: skip the bad node and
// continue writing the rest of the batch.
func normalizeMythicTreeNodesForBatch(treeNodes []*databaseStructs.MythicTree) []*databaseStructs.MythicTree {
	normalized := make([]*databaseStructs.MythicTree, 0, len(treeNodes))
	for _, treeNode := range treeNodes {
		if treeNode == nil {
			continue
		}
		if len(treeNode.Name) == 0 {
			logging.LogError(nil, "Skipping MythicTree entry with empty name", "full_path", string(treeNode.FullPath), "tree_type", treeNode.TreeType)
			continue
		}
		if len(treeNode.DisplayPath) == 0 {
			treeNode.DisplayPath = append([]byte(nil), treeNode.Name...)
		}
		cloneMythicTreeNodeBytes(treeNode)
		normalized = append(normalized, treeNode)
	}
	return normalized
}

// normalizeMythicTreeNodeForUpsert fills required database fields that callers
// may omit. Agents do not always provide a display path, so default it to the
// node name before insert/update to avoid null display_path writes and keep the
// UI label meaningful.
func normalizeMythicTreeNodeForUpsert(treeNode *databaseStructs.MythicTree) error {
	if treeNode == nil {
		return nil
	}
	if len(treeNode.Name) == 0 {
		return fmt.Errorf("can't create MythicTree entry with empty name")
	}
	if len(treeNode.DisplayPath) == 0 {
		treeNode.DisplayPath = append([]byte(nil), treeNode.Name...)
	}
	cloneMythicTreeNodeBytes(treeNode)
	return nil
}

// cloneMythicTreeNodeBytes gives queued nodes ownership of mutable byte slices.
// Batches hold many MythicTree structs in memory before DB writes, so none of
// their path/name fields should alias shared builder buffers.
func cloneMythicTreeNodeBytes(treeNode *databaseStructs.MythicTree) {
	treeNode.Name = cloneByteSliceForDatabase(treeNode.Name)
	treeNode.FullPath = cloneByteSliceForDatabase(treeNode.FullPath)
	treeNode.ParentPath = cloneByteSliceForDatabase(treeNode.ParentPath)
	treeNode.DisplayPath = cloneByteSliceForDatabase(treeNode.DisplayPath)
}

// cloneByteSliceForDatabase gives callers a private slice while preserving
// empty-but-non-null bytea values. PostgreSQL treats nil []byte as NULL, which
// is different from the empty path MythicTree uses for root parent_path values.
func cloneByteSliceForDatabase(input []byte) []byte {
	output := make([]byte, len(input))
	copy(output, input)
	return output
}

// dedupeMythicTreeNodes removes duplicate rows that would hit the same
// ON CONFLICT key inside a single batch. PostgreSQL rejects a multi-source
// statement that updates the same target row twice, and even though this code
// loops prepared statements, deduping saves extra DB work while preserving the
// effective "last write wins plus merged metadata" behavior.
func dedupeMythicTreeNodes(treeNodes []*databaseStructs.MythicTree) []*databaseStructs.MythicTree {
	if len(treeNodes) == 0 {
		return treeNodes
	}
	deduped := make([]*databaseStructs.MythicTree, 0, len(treeNodes))
	seen := make(map[mythicTreeNodeKey]int, len(treeNodes))
	for _, treeNode := range treeNodes {
		if treeNode == nil || len(treeNode.Name) == 0 {
			continue
		}
		key := getMythicTreeNodeKey(treeNode)
		if index, ok := seen[key]; ok {
			deduped[index] = mergeMythicTreeNodes(deduped[index], treeNode)
			continue
		}
		seen[key] = len(deduped)
		deduped = append(deduped, treeNode)
	}
	return deduped
}

// getMythicTreeNodeKey builds the conflict identity used before the DB write so
// parent/current/child nodes in the same response can be merged safely.
func getMythicTreeNodeKey(treeNode *databaseStructs.MythicTree) mythicTreeNodeKey {
	return mythicTreeNodeKey{
		Host:          treeNode.Host,
		OperationID:   treeNode.OperationID,
		FullPath:      string(treeNode.FullPath),
		TreeType:      treeNode.TreeType,
		CallbackID:    treeNode.CallbackID.Int64,
		CallbackValid: treeNode.CallbackID.Valid,
	}
}

// mergeMythicTreeNodes combines two queued writes for the same MythicTree row.
// It mirrors the SQL upsert rules: preserve child state, OR success, merge JSON
// metadata, and keep an existing API token if the incoming node omitted one.
func mergeMythicTreeNodes(existing *databaseStructs.MythicTree, incoming *databaseStructs.MythicTree) *databaseStructs.MythicTree {
	incoming.CanHaveChildren = existing.CanHaveChildren || existing.HasChildren || incoming.CanHaveChildren
	incoming.HasChildren = existing.HasChildren || incoming.HasChildren
	incoming.Success = mythicTreeSQLBoolOr(existing.Success, incoming.Success)
	incoming.Metadata = mergeMythicTreeMetadata(existing.Metadata, incoming.Metadata)
	if !incoming.APITokensID.Valid && existing.APITokensID.Valid {
		incoming.APITokensID = existing.APITokensID
	}
	return incoming
}

// mythicTreeSQLBoolOr matches PostgreSQL's nullable boolean OR behavior closely
// enough for pre-DB merges: true wins, false only survives when both sides are
// explicitly valid, and unknown remains unknown otherwise.
func mythicTreeSQLBoolOr(left sql.NullBool, right sql.NullBool) sql.NullBool {
	if (left.Valid && left.Bool) || (right.Valid && right.Bool) {
		return sql.NullBool{Valid: true, Bool: true}
	}
	if left.Valid && right.Valid {
		return sql.NullBool{Valid: true, Bool: false}
	}
	return sql.NullBool{}
}

// mergeMythicTreeMetadata applies the same right-side override behavior as the
// jsonb concatenation used in the database upsert.
func mergeMythicTreeMetadata(left databaseStructs.MythicJSONText, right databaseStructs.MythicJSONText) databaseStructs.MythicJSONText {
	merged := left.StructValue()
	for key, value := range right.StructValue() {
		merged[key] = value
	}
	return GetMythicJSONTextFromStruct(merged)
}

// buildMythicTreeParentNodes constructs all ancestor nodes for a path without
// writing them immediately. Callers can append the current node and children,
// then flush everything in one batch.
func buildMythicTreeParentNodes(pathData utils.AnalyzedPath, displayPathData utils.AnalyzedPath, task databaseStructs.Task, treeType string) []*databaseStructs.MythicTree {
	parentNodes := make([]*databaseStructs.MythicTree, 0, len(pathData.PathPieces))
	for i := range pathData.PathPieces {
		parentPath, fullPath, name := getParentPathFullPathName(pathData, i, treeType)
		if parentPath == "" && fullPath == "" && name == "" {
			continue
		}
		_, displayFullPath, _ := getParentPathFullPathName(displayPathData, i, treeType)
		newTree := databaseStructs.MythicTree{
			Host:            pathData.Host,
			TaskID:          task.ID,
			OperationID:     task.OperationID,
			Name:            []byte(name),
			FullPath:        []byte(fullPath),
			ParentPath:      []byte(parentPath),
			TreeType:        treeType,
			CanHaveChildren: true,
			Deleted:         false,
			HasChildren:     true,
			DisplayPath:     []byte(displayFullPath),
		}
		newTree.Metadata = GetMythicJSONTextFromStruct(nil)
		newTree.Os = getOSTypeBasedOnPathSeparator(pathData.PathSeparator, treeType)
		newTree.CallbackID.Valid = true
		newTree.CallbackID.Int64 = int64(task.Callback.ID)
		parentNodes = append(parentNodes, &newTree)
	}
	return parentNodes
}

// buildFileBrowserChildMythicTreeNode converts a reported child entry into the
// exact MythicTree row shape used by both normal file browser handling and
// update_deleted reconciliation.
func buildFileBrowserChildMythicTreeNode(task databaseStructs.Task, host string, parentFullPath []byte, pathSeparator string, child agentMessagePostResponseFileBrowserChildren, os string, apitokensId int) *databaseStructs.MythicTree {
	newTreeChild := databaseStructs.MythicTree{
		Host:            host,
		TaskID:          task.ID,
		OperationID:     task.OperationID,
		Name:            []byte(child.Name),
		ParentPath:      parentFullPath,
		TreeType:        databaseStructs.TREE_TYPE_FILE,
		CanHaveChildren: !child.IsFile,
		Deleted:         false,
		Os:              os,
		DisplayPath:     []byte{},
	}
	newTreeChild.FullPath = treeNodeGetFullPath(parentFullPath, []byte(child.Name), []byte(pathSeparator), databaseStructs.TREE_TYPE_FILE)
	fileMetaData := addChildFilePermissions(&child)
	newTreeChild.Metadata = GetMythicJSONTextFromStruct(fileMetaData)
	newTreeChild.CallbackID.Valid = true
	newTreeChild.CallbackID.Int64 = int64(task.Callback.ID)
	if apitokensId > 0 {
		newTreeChild.APITokensID.Valid = true
		newTreeChild.APITokensID.Int64 = int64(apitokensId)
	}
	return &newTreeChild
}

// groupFileBrowserUpdateDeletedEntries keeps chunked listings for the same
// directory together while preventing entries for different directories in the
// same task from being reconciled against the first path only.
func groupFileBrowserUpdateDeletedEntries(task *databaseStructs.Task, fileBrowsers []*agentMessagePostResponseFileBrowser) ([]fileBrowserUpdateDeletedGroup, error) {
	groups := make([]fileBrowserUpdateDeletedGroup, 0, len(fileBrowsers))
	groupsByPath := make(map[string]int, len(fileBrowsers))
	for _, fileBrowser := range fileBrowsers {
		if fileBrowser == nil {
			continue
		}
		if fileBrowser.Name == "" {
			return nil, fmt.Errorf("can't reconcile file browser update_deleted entry with empty name")
		}
		pathData, fullPath, err := getFileBrowserUpdateDeletedPath(task, fileBrowser)
		if err != nil {
			return nil, err
		}
		groupKey := pathData.Host + "\x00" + string(fullPath)
		groupIndex, ok := groupsByPath[groupKey]
		if !ok {
			groupIndex = len(groups)
			groupsByPath[groupKey] = groupIndex
			groups = append(groups, fileBrowserUpdateDeletedGroup{
				PathData:       pathData,
				FullPath:       fullPath,
				ChildrenByName: make(map[string]agentMessagePostResponseFileBrowserChildren),
			})
		}
		if fileBrowser.Files == nil {
			continue
		}
		for _, newEntry := range *fileBrowser.Files {
			groups[groupIndex].ChildrenByName[newEntry.Name] = newEntry
		}
	}
	return groups, nil
}

// getFileBrowserUpdateDeletedPath derives the database parent identity for one
// update_deleted response. This mirrors the current-node full_path logic in the
// main file browser handler so reconciliation queries the correct child set.
func getFileBrowserUpdateDeletedPath(task *databaseStructs.Task, fileBrowser *agentMessagePostResponseFileBrowser) (utils.AnalyzedPath, []byte, error) {
	pathData, err := utils.SplitFilePathGetHost(fileBrowser.ParentPath, fileBrowser.Name, []string{})
	if err != nil {
		return utils.AnalyzedPath{}, nil, err
	}
	if pathData.Host == "" {
		pathData.Host = strings.ToUpper(task.Callback.Host)
	}
	if fileBrowser.Host != "" {
		pathData.Host = strings.ToUpper(fileBrowser.Host)
	}
	realParentPath := strings.Join(pathData.PathPieces, pathData.PathSeparator)
	if len(realParentPath) > 2 && realParentPath[0] == '/' && realParentPath[1] == '/' {
		realParentPath = realParentPath[1:]
	}
	fullPath := treeNodeGetFullPath(
		[]byte(realParentPath),
		[]byte(fileBrowser.Name),
		[]byte(pathData.PathSeparator),
		databaseStructs.TREE_TYPE_FILE)
	return pathData, fullPath, nil
}

// reconcileFileBrowserUpdateDeletedGroup applies update_deleted semantics for a
// single listed directory: update reported children, insert new children, and
// mark DB-only children deleted. Each group is independent so a task can report
// multiple directories without cross-contaminating their child sets.
func reconcileFileBrowserUpdateDeletedGroup(task *databaseStructs.Task, group fileBrowserUpdateDeletedGroup, apitokensId int) error {
	var existingTreeEntries []databaseStructs.MythicTree
	err := database.DB.Select(&existingTreeEntries, `SELECT
        id, "name", success, full_path, parent_path, operation_id, host, tree_type, callback_id, os, display_path
		FROM mythictree WHERE
		parent_path=$1 AND operation_id=$2 AND host=$3 AND tree_type=$4`,
		group.FullPath, task.OperationID, group.PathData.Host, databaseStructs.TREE_TYPE_FILE)
	if err != nil {
		return err
	}
	namesToDeleteAndUpdate := make(map[string]struct{}, len(existingTreeEntries)+len(group.ChildrenByName))
	treeNodesToUpsert := make([]*databaseStructs.MythicTree, 0, len(group.ChildrenByName))
	for _, existingEntry := range existingTreeEntries {
		if newEntry, ok := group.ChildrenByName[string(existingEntry.Name)]; ok {
			namesToDeleteAndUpdate[newEntry.Name] = struct{}{}
			newTreeChild := databaseStructs.MythicTree{
				Host:            group.PathData.Host,
				TaskID:          task.ID,
				OperationID:     task.OperationID,
				Name:            []byte(newEntry.Name),
				ParentPath:      existingEntry.ParentPath,
				FullPath:        existingEntry.FullPath,
				TreeType:        databaseStructs.TREE_TYPE_FILE,
				CanHaveChildren: !newEntry.IsFile,
				Deleted:         false,
				Success:         existingEntry.Success,
				ID:              existingEntry.ID,
				Os:              existingEntry.Os,
				DisplayPath:     existingEntry.DisplayPath,
				CallbackID:      existingEntry.CallbackID,
			}
			fileMetaData := addChildFilePermissions(&newEntry)
			newTreeChild.Metadata = GetMythicJSONTextFromStruct(fileMetaData)
			if !newTreeChild.CallbackID.Valid {
				newTreeChild.CallbackID.Valid = true
				newTreeChild.CallbackID.Int64 = int64(task.Callback.ID)
			}
			treeNodesToUpsert = append(treeNodesToUpsert, &newTreeChild)
		} else {
			namesToDeleteAndUpdate[string(existingEntry.Name)] = struct{}{}
			existingEntry.Deleted = true
			existingEntry.TaskID = task.ID
			deleteTreeNode(existingEntry, true)
		}
	}
	for name, newEntry := range group.ChildrenByName {
		if _, ok := namesToDeleteAndUpdate[name]; !ok {
			treeNodesToUpsert = append(treeNodesToUpsert, buildFileBrowserChildMythicTreeNode(
				*task,
				group.PathData.Host,
				group.FullPath,
				group.PathData.PathSeparator,
				newEntry,
				getOSTypeBasedOnPathSeparator(group.PathData.PathSeparator, databaseStructs.TREE_TYPE_FILE),
				apitokensId))
		}
	}
	return upsertMythicTreeNodes(treeNodesToUpsert)
}

// buildProcessMythicTreeNode centralizes process-to-MythicTree normalization so
// update_deleted and normal process responses use identical path, OS, metadata,
// callback, and API token handling.
func buildProcessMythicTreeNode(task databaseStructs.Task, host string, process agentMessagePostResponseProcesses, apitokensId int) *databaseStructs.MythicTree {
	process.Name = normalizeProcessName(process.Name)
	parentPath := getProcessParentPath(process.ParentProcessID)
	fullPath := treeNodeGetFullPath(
		[]byte(parentPath),
		[]byte(strconv.Itoa(process.ProcessID)),
		[]byte("/"),
		databaseStructs.TREE_TYPE_PROCESS)
	newTree := databaseStructs.MythicTree{
		Host:            host,
		TaskID:          task.ID,
		OperationID:     task.OperationID,
		Name:            []byte(process.Name),
		ParentPath:      []byte(parentPath),
		FullPath:        fullPath,
		TreeType:        databaseStructs.TREE_TYPE_PROCESS,
		CanHaveChildren: true,
		Deleted:         false,
		DisplayPath:     []byte{},
	}
	if process.OS != nil {
		newTree.Os = *process.OS
	} else {
		newTree.Os = task.Callback.Payload.Os
	}
	metadata := map[string]interface{}{
		"process_id":              process.ProcessID,
		"parent_process_id":       process.ParentProcessID,
		"architecture":            process.Architecture,
		"bin_path":                process.BinPath,
		"name":                    process.Name,
		"user":                    process.User,
		"command_line":            process.CommandLine,
		"integrity_level":         process.IntegrityLevel,
		"start_time":              process.StartTime,
		"description":             process.Description,
		"signer":                  process.Signer,
		"protected_process_level": process.ProtectionProcessLevel,
	}
	reflectBackOtherKeys(&metadata, &process.Other)
	newTree.Metadata = GetMythicJSONTextFromStruct(metadata)
	newTree.CallbackID.Valid = true
	newTree.CallbackID.Int64 = int64(task.Callback.ID)
	if apitokensId > 0 {
		newTree.APITokensID.Valid = true
		newTree.APITokensID.Int64 = int64(apitokensId)
	}
	return &newTree
}

// normalizeProcessName preserves the existing MythicTree behavior for unnamed
// processes so process matching and metadata generation stay consistent.
func normalizeProcessName(name string) string {
	if name == "" {
		return "unknown"
	}
	return name
}

// getProcessParentPath keeps root/no-parent processes represented as an empty
// parent path, matching the previous process tree layout.
func getProcessParentPath(parentProcessID int) string {
	if parentProcessID <= 0 {
		return ""
	}
	return strconv.Itoa(parentProcessID)
}

// getProcessMatchKey creates the in-memory identity for reported process rows.
// PID alone is not enough here because the existing behavior treats name and
// parent PID as part of whether a process entry still matches.
func getProcessMatchKey(process agentMessagePostResponseProcesses) string {
	return strconv.Itoa(process.ProcessID) + "\x00" + normalizeProcessName(process.Name) + "\x00" + getProcessParentPath(process.ParentProcessID)
}

// getExistingProcessMatchKey creates the same identity from database rows so
// update_deleted can compare existing and incoming process sets in O(n).
func getExistingProcessMatchKey(existingEntry databaseStructs.MythicTree) string {
	return string(existingEntry.FullPath) + "\x00" + string(existingEntry.Name) + "\x00" + string(existingEntry.ParentPath)
}

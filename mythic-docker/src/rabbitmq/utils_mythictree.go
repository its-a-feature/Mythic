package rabbitmq

import (
	"bytes"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/jmoiron/sqlx"
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

const mythicTreeDeleteBatchSize = 500

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
	ChildrenByName map[string]mythicTreeChildNodeData
}

// mythicTreeChildNodeData is the normalized child payload used by both file
// browser children and file-like custom browser children before they are mapped
// to MythicTree database rows.
type mythicTreeChildNodeData struct {
	Name            string
	DisplayPath     []byte
	CanHaveChildren bool
	Metadata        databaseStructs.MythicJSONText
}

// mythicTreeCascadeDeleteTarget describes one missing file-like node whose
// descendants should be marked deleted along with the node itself.
type mythicTreeCascadeDeleteTarget struct {
	Host            string
	OperationID     int
	TreeType        string
	CallbackID      int64
	CallbackIDValid bool
	FullPath        []byte
	PathSeparator   string
}

// mythicTreeChildrenReconciliation holds the DB writes calculated for an
// update_deleted parent path without applying them immediately.
type mythicTreeChildrenReconciliation struct {
	TreeNodesToUpsert    []*databaseStructs.MythicTree
	IDsToDelete          []int
	CascadeDeleteTargets []mythicTreeCascadeDeleteTarget
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

// deleteMythicTreeNodes marks MythicTree rows deleted in bulk. File-like trees
// can pass cascade targets so descendants are deleted with chunked SQL updates
// instead of one deleteTreeNode call per missing child.
func deleteMythicTreeNodes(taskID int, idsToDelete []int, cascadeTargets []mythicTreeCascadeDeleteTarget) error {
	idsToDelete = dedupeMythicTreeDeleteIDs(idsToDelete)
	cascadeTargets = dedupeMythicTreeCascadeDeleteTargets(cascadeTargets)
	if len(idsToDelete) == 0 && len(cascadeTargets) == 0 {
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
	for start := 0; start < len(cascadeTargets); start += mythicTreeDeleteBatchSize {
		end := start + mythicTreeDeleteBatchSize
		if end > len(cascadeTargets) {
			end = len(cascadeTargets)
		}
		if err = deleteMythicTreeDescendantBatch(transaction, taskID, cascadeTargets[start:end]); err != nil {
			return err
		}
	}
	for start := 0; start < len(idsToDelete); start += mythicTreeDeleteBatchSize {
		end := start + mythicTreeDeleteBatchSize
		if end > len(idsToDelete) {
			end = len(idsToDelete)
		}
		if err = deleteMythicTreeIDBatch(transaction, taskID, idsToDelete[start:end]); err != nil {
			return err
		}
	}
	if err = transaction.Commit(); err != nil {
		return err
	}
	committed = true
	return nil
}

// deleteMythicTreeIDBatch marks exact MythicTree IDs deleted inside the caller's
// transaction.
func deleteMythicTreeIDBatch(transaction *sqlx.Tx, taskID int, idsToDelete []int) error {
	if len(idsToDelete) == 0 {
		return nil
	}
	deleteQuery, args, err := sqlx.Named(`UPDATE mythictree SET
		deleted=true, "timestamp"=now(), task_id=:task_id
		WHERE id IN (:ids)`, map[string]interface{}{
		"ids":     idsToDelete,
		"task_id": taskID,
	})
	if err != nil {
		return err
	}
	deleteQuery, args, err = sqlx.In(deleteQuery, args...)
	if err != nil {
		return err
	}
	deleteQuery = database.DB.Rebind(deleteQuery)
	_, err = transaction.Exec(deleteQuery, args...)
	return err
}

// deleteMythicTreeDescendantBatch marks descendants of missing file-like nodes
// deleted in one query. It uses exact parent_path plus separator-aware byte
// prefix matching so /tmp/foo does not delete /tmp/foobar, and paths containing
// SQL wildcard characters are treated as literal bytes.
func deleteMythicTreeDescendantBatch(transaction *sqlx.Tx, taskID int, cascadeTargets []mythicTreeCascadeDeleteTarget) error {
	if len(cascadeTargets) == 0 {
		return nil
	}
	args := map[string]interface{}{
		"task_id": taskID,
	}
	clauses := make([]string, 0, len(cascadeTargets))
	for index, target := range cascadeTargets {
		callbackClause := "callback_id IS NULL"
		if target.CallbackIDValid {
			callbackKey := fmt.Sprintf("callback_id_%d", index)
			callbackClause = "callback_id=:" + callbackKey
			args[callbackKey] = target.CallbackID
		}
		args[fmt.Sprintf("host_%d", index)] = target.Host
		args[fmt.Sprintf("operation_id_%d", index)] = target.OperationID
		args[fmt.Sprintf("tree_type_%d", index)] = target.TreeType
		args[fmt.Sprintf("child_parent_path_%d", index)] = cloneByteSliceForDatabase(target.FullPath)
		args[fmt.Sprintf("descendant_parent_path_%d", index)] = getMythicTreeDescendantParentPathPrefix(target.FullPath, target.PathSeparator)
		clauses = append(clauses, fmt.Sprintf(
			`(host=:host_%d AND operation_id=:operation_id_%d AND tree_type=:tree_type_%d AND %s AND (parent_path=:child_parent_path_%d OR substring(parent_path from 1 for length(:descendant_parent_path_%d))=:descendant_parent_path_%d))`,
			index, index, index, callbackClause, index, index, index))
	}
	_, err := transaction.NamedExec(`UPDATE mythictree SET
		deleted=true, "timestamp"=now(), task_id=:task_id
		WHERE `+strings.Join(clauses, " OR "), args)
	return err
}

// getMythicTreeDescendantParentPathPrefix returns the byte prefix for
// descendant parent paths below a deleted node.
func getMythicTreeDescendantParentPathPrefix(fullPath []byte, pathSeparator string) []byte {
	prefix := cloneByteSliceForDatabase(fullPath)
	separatorBytes := []byte(pathSeparator)
	if len(separatorBytes) > 0 && len(prefix) > 0 && !bytes.HasSuffix(prefix, separatorBytes) {
		prefix = append(prefix, separatorBytes...)
	}
	return prefix
}

// dedupeMythicTreeDeleteIDs avoids redundant exact-row updates when multiple
// reconciliation groups point at the same row.
func dedupeMythicTreeDeleteIDs(idsToDelete []int) []int {
	if len(idsToDelete) == 0 {
		return idsToDelete
	}
	deduped := make([]int, 0, len(idsToDelete))
	seen := make(map[int]struct{}, len(idsToDelete))
	for _, id := range idsToDelete {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		deduped = append(deduped, id)
	}
	return deduped
}

// dedupeMythicTreeCascadeDeleteTargets removes duplicate cascade scopes before
// building the chunked SQL OR clauses.
func dedupeMythicTreeCascadeDeleteTargets(targets []mythicTreeCascadeDeleteTarget) []mythicTreeCascadeDeleteTarget {
	if len(targets) == 0 {
		return targets
	}
	deduped := make([]mythicTreeCascadeDeleteTarget, 0, len(targets))
	seen := make(map[string]struct{}, len(targets))
	for _, target := range targets {
		key := strings.Join([]string{
			target.Host,
			strconv.Itoa(target.OperationID),
			target.TreeType,
			strconv.FormatBool(target.CallbackIDValid),
			strconv.FormatInt(target.CallbackID, 10),
			string(target.FullPath),
			target.PathSeparator,
		}, "\x00")
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		target.FullPath = cloneByteSliceForDatabase(target.FullPath)
		deduped = append(deduped, target)
	}
	return deduped
}

// ensureTaskCallbackMythicTreeGroups lazily fills callback mythictree_groups for
// direct RPC/webhook paths that only loaded the callback id. Agent message
// post-response tasks already include the groups in their initial task query.
func ensureTaskCallbackMythicTreeGroups(task *databaseStructs.Task) error {
	if task == nil || len(task.Callback.MythicTreeGroups) > 0 || task.Callback.ID <= 0 {
		return nil
	}
	return database.DB.Get(&task.Callback.MythicTreeGroups, `SELECT mythictree_groups FROM callback WHERE id=$1`, task.Callback.ID)
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
	return buildMythicTreeChildNode(task, host, parentFullPath, pathSeparator, databaseStructs.TREE_TYPE_FILE, fileBrowserChildNodeData(child), os, apitokensId)
}

// buildCustomBrowserChildMythicTreeNode maps file-like custom browser children
// into the same MythicTree child shape used by file browser responses.
func buildCustomBrowserChildMythicTreeNode(task databaseStructs.Task, host string, parentFullPath []byte, pathSeparator string, treeType string, child agentMessagePostResponseCustomBrowserChildren, os string, apitokensId int) *databaseStructs.MythicTree {
	return buildMythicTreeChildNode(task, host, parentFullPath, pathSeparator, treeType, customBrowserChildNodeData(child), os, apitokensId)
}

// buildMythicTreeChildNode owns the common child-row mechanics for file browser
// and file-like custom browser data: path construction, callback/api-token
// attribution, and metadata assignment.
func buildMythicTreeChildNode(task databaseStructs.Task, host string, parentFullPath []byte, pathSeparator string, treeType string, child mythicTreeChildNodeData, os string, apitokensId int) *databaseStructs.MythicTree {
	newTreeChild := databaseStructs.MythicTree{
		Host:            host,
		TaskID:          task.ID,
		OperationID:     task.OperationID,
		Name:            []byte(child.Name),
		ParentPath:      parentFullPath,
		TreeType:        treeType,
		CanHaveChildren: child.CanHaveChildren,
		Deleted:         false,
		Os:              os,
		DisplayPath:     child.DisplayPath,
	}
	newTreeChild.FullPath = treeNodeGetFullPath(parentFullPath, []byte(child.Name), []byte(pathSeparator), treeType)
	newTreeChild.Metadata = child.Metadata
	newTreeChild.CallbackID.Valid = true
	newTreeChild.CallbackID.Int64 = int64(task.Callback.ID)
	if apitokensId > 0 {
		newTreeChild.APITokensID.Valid = true
		newTreeChild.APITokensID.Int64 = int64(apitokensId)
	}
	return &newTreeChild
}

// customBrowserChildNodeData keeps custom-browser display path and metadata
// mapping separate from the shared child-node construction logic.
func customBrowserChildNodeData(child agentMessagePostResponseCustomBrowserChildren) mythicTreeChildNodeData {
	return mythicTreeChildNodeData{
		Name:            child.Name,
		DisplayPath:     []byte(child.DisplayPath),
		CanHaveChildren: child.CanHaveChildren,
		Metadata:        GetMythicJSONTextFromStruct(child.Metadata),
	}
}

// fileBrowserChildNodeData keeps the file-browser-specific metadata conversion
// separate from the common MythicTree child builder.
func fileBrowserChildNodeData(child agentMessagePostResponseFileBrowserChildren) mythicTreeChildNodeData {
	return mythicTreeChildNodeData{
		Name:            child.Name,
		CanHaveChildren: !child.IsFile,
		Metadata:        GetMythicJSONTextFromStruct(addChildFilePermissions(&child)),
	}
}

// customBrowserChildrenByName converts a custom browser child slice into the
// common reconciliation map. The last entry for a duplicate child name wins,
// matching the existing single-row upsert behavior.
func customBrowserChildrenByName(children *[]agentMessagePostResponseCustomBrowserChildren) map[string]mythicTreeChildNodeData {
	if children == nil {
		return map[string]mythicTreeChildNodeData{}
	}
	childrenByName := make(map[string]mythicTreeChildNodeData, len(*children))
	for _, child := range *children {
		childrenByName[child.Name] = customBrowserChildNodeData(child)
	}
	return childrenByName
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
				ChildrenByName: make(map[string]mythicTreeChildNodeData),
			})
		}
		if fileBrowser.Files == nil {
			continue
		}
		for _, newEntry := range *fileBrowser.Files {
			groups[groupIndex].ChildrenByName[newEntry.Name] = fileBrowserChildNodeData(newEntry)
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
	return reconcileFileBrowserUpdateDeletedGroups(task, []fileBrowserUpdateDeletedGroup{group}, apitokensId)
}

// reconcileFileBrowserUpdateDeletedGroups batches update_deleted writes across
// all file-browser chunks for a task completion flush.
func reconcileFileBrowserUpdateDeletedGroups(task *databaseStructs.Task, groups []fileBrowserUpdateDeletedGroup, apitokensId int) error {
	reconciliation := mythicTreeChildrenReconciliation{}
	for _, group := range groups {
		groupReconciliation, err := buildMythicTreeChildrenReconciliation(
			task,
			group.PathData.Host,
			group.FullPath,
			group.PathData.PathSeparator,
			databaseStructs.TREE_TYPE_FILE,
			getOSTypeBasedOnPathSeparator(group.PathData.PathSeparator, databaseStructs.TREE_TYPE_FILE),
			group.ChildrenByName,
			apitokensId,
			true)
		if err != nil {
			return err
		}
		appendMythicTreeChildrenReconciliation(&reconciliation, groupReconciliation)
	}
	return applyMythicTreeChildrenReconciliation(task.ID, reconciliation)
}

// reconcileMythicTreeChildren is the single-parent convenience wrapper around
// the batch reconciliation builder and applier.
func reconcileMythicTreeChildren(task *databaseStructs.Task, host string, parentFullPath []byte, pathSeparator string, treeType string, os string, childrenByName map[string]mythicTreeChildNodeData, apitokensId int, preserveExistingDisplayPathWhenEmpty bool) error {
	reconciliation, err := buildMythicTreeChildrenReconciliation(task, host, parentFullPath, pathSeparator, treeType, os, childrenByName, apitokensId, preserveExistingDisplayPathWhenEmpty)
	if err != nil {
		return err
	}
	return applyMythicTreeChildrenReconciliation(task.ID, reconciliation)
}

// buildMythicTreeChildrenReconciliation calculates update_deleted changes for
// one parent path without applying them. It scopes existing rows the same way
// process update_deleted does: same operation/host/tree and overlapping
// callback mythictree_groups. Callers can combine many parent paths and then
// apply one batch of upserts/deletes.
func buildMythicTreeChildrenReconciliation(task *databaseStructs.Task, host string, parentFullPath []byte, pathSeparator string, treeType string, os string, childrenByName map[string]mythicTreeChildNodeData, apitokensId int, preserveExistingDisplayPathWhenEmpty bool) (mythicTreeChildrenReconciliation, error) {
	reconciliation := mythicTreeChildrenReconciliation{
		TreeNodesToUpsert: make([]*databaseStructs.MythicTree, 0, len(childrenByName)),
	}
	if err := ensureTaskCallbackMythicTreeGroups(task); err != nil {
		return reconciliation, err
	}
	var existingTreeEntries []databaseStructs.MythicTree
	err := database.DB.Select(&existingTreeEntries, `SELECT
		mythictree.id, mythictree."name", mythictree.success, mythictree.full_path, mythictree.parent_path,
		mythictree.operation_id, mythictree.host, mythictree.tree_type, mythictree.callback_id,
		mythictree.os, mythictree.display_path
		FROM mythictree
		JOIN callback ON mythictree.callback_id = callback.id
		WHERE
		mythictree.parent_path=$1 AND mythictree.operation_id=$2 AND mythictree.host=$3 AND
		mythictree.tree_type=$4 AND callback.mythictree_groups && $5`,
		parentFullPath, task.OperationID, host, treeType, task.Callback.MythicTreeGroups)
	if err != nil {
		return reconciliation, err
	}
	namesToDeleteAndUpdate := make(map[string]struct{}, len(existingTreeEntries)+len(childrenByName))
	for _, existingEntry := range existingTreeEntries {
		if newEntry, ok := childrenByName[string(existingEntry.Name)]; ok {
			namesToDeleteAndUpdate[newEntry.Name] = struct{}{}
			displayPath := newEntry.DisplayPath
			if preserveExistingDisplayPathWhenEmpty && len(displayPath) == 0 {
				displayPath = existingEntry.DisplayPath
			}
			newTreeChild := databaseStructs.MythicTree{
				Host:            host,
				TaskID:          task.ID,
				OperationID:     task.OperationID,
				Name:            []byte(newEntry.Name),
				ParentPath:      existingEntry.ParentPath,
				FullPath:        existingEntry.FullPath,
				TreeType:        treeType,
				CanHaveChildren: newEntry.CanHaveChildren,
				Deleted:         false,
				Success:         existingEntry.Success,
				ID:              existingEntry.ID,
				Os:              existingEntry.Os,
				DisplayPath:     displayPath,
				CallbackID:      existingEntry.CallbackID,
			}
			if newTreeChild.Os == "" {
				newTreeChild.Os = os
			}
			newTreeChild.Metadata = newEntry.Metadata
			if !newTreeChild.CallbackID.Valid {
				newTreeChild.CallbackID.Valid = true
				newTreeChild.CallbackID.Int64 = int64(task.Callback.ID)
			}
			if apitokensId > 0 {
				newTreeChild.APITokensID.Valid = true
				newTreeChild.APITokensID.Int64 = int64(apitokensId)
			}
			reconciliation.TreeNodesToUpsert = append(reconciliation.TreeNodesToUpsert, &newTreeChild)
		} else {
			namesToDeleteAndUpdate[string(existingEntry.Name)] = struct{}{}
			reconciliation.IDsToDelete = append(reconciliation.IDsToDelete, existingEntry.ID)
			reconciliation.CascadeDeleteTargets = append(reconciliation.CascadeDeleteTargets, mythicTreeCascadeDeleteTarget{
				Host:            existingEntry.Host,
				OperationID:     existingEntry.OperationID,
				TreeType:        existingEntry.TreeType,
				CallbackID:      existingEntry.CallbackID.Int64,
				CallbackIDValid: existingEntry.CallbackID.Valid,
				FullPath:        existingEntry.FullPath,
				PathSeparator:   pathSeparator,
			})
		}
	}
	for name, newEntry := range childrenByName {
		if _, ok := namesToDeleteAndUpdate[name]; !ok {
			reconciliation.TreeNodesToUpsert = append(reconciliation.TreeNodesToUpsert, buildMythicTreeChildNode(
				*task,
				host,
				parentFullPath,
				pathSeparator,
				treeType,
				newEntry,
				os,
				apitokensId))
		}
	}
	return reconciliation, nil
}

// appendMythicTreeChildrenReconciliation merges independently calculated
// update_deleted changes so callers can issue one write batch.
func appendMythicTreeChildrenReconciliation(target *mythicTreeChildrenReconciliation, incoming mythicTreeChildrenReconciliation) {
	target.TreeNodesToUpsert = append(target.TreeNodesToUpsert, incoming.TreeNodesToUpsert...)
	target.IDsToDelete = append(target.IDsToDelete, incoming.IDsToDelete...)
	target.CascadeDeleteTargets = append(target.CascadeDeleteTargets, incoming.CascadeDeleteTargets...)
}

// applyMythicTreeChildrenReconciliation writes all queued update_deleted
// upserts first, then marks stale exact rows and descendants deleted in bulk.
func applyMythicTreeChildrenReconciliation(taskID int, reconciliation mythicTreeChildrenReconciliation) error {
	if err := upsertMythicTreeNodes(reconciliation.TreeNodesToUpsert); err != nil {
		return err
	}
	return deleteMythicTreeNodes(taskID, reconciliation.IDsToDelete, reconciliation.CascadeDeleteTargets)
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

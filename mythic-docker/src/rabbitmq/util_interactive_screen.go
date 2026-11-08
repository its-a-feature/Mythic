package rabbitmq

import (
	"bytes"
	"crypto/md5"
	"crypto/sha1"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

const (
	screenParserGround = iota
	screenParserEscape
	screenParserCSI
)

const screenParserMaxParams = 16

// interactiveScreenParser tracks alternate screen switches (ESC[?1049h etc) across output chunks
type interactiveScreenParser struct {
	state     int
	valid     bool
	private   bool
	started   bool
	param     int
	params    []int
	alternate bool
	seqStart  int
}

// interactiveScreenChange is a switch to or from the alternate screen and where its sequence sits in the chunk
type interactiveScreenChange struct {
	Alternate bool
	Start     int
	End       int
}

func (p *interactiveScreenParser) feed(data []byte) []interactiveScreenChange {
	var changes []interactiveScreenChange
	// a sequence carried over from the previous chunk starts at the beginning of this one
	p.seqStart = 0
	setAlternate := func(alternate bool, end int) {
		if p.alternate != alternate {
			p.alternate = alternate
			changes = append(changes, interactiveScreenChange{Alternate: alternate, Start: p.seqStart, End: end})
		}
	}
	for i, b := range data {
		if b == 0x1b {
			p.state = screenParserEscape
			p.seqStart = i
			continue
		}
		switch p.state {
		case screenParserEscape:
			p.state = screenParserGround
			switch b {
			case '[':
				p.state = screenParserCSI
				p.valid = true
				p.private = false
				p.started = false
				p.param = 0
				p.params = p.params[:0]
			case 'c':
				setAlternate(false, i+1)
			}
		case screenParserCSI:
			switch {
			case b == 0x18 || b == 0x1a:
				p.state = screenParserGround
			case b == '?' && !p.started:
				p.private = true
				p.started = true
			case b >= '0' && b <= '9':
				p.started = true
				if p.param < 100000 {
					p.param = p.param*10 + int(b-'0')
				}
			case b == ';':
				p.started = true
				if len(p.params) >= screenParserMaxParams {
					p.valid = false
				} else {
					p.params = append(p.params, p.param)
				}
				p.param = 0
			case b >= 0x40 && b <= 0x7e:
				p.state = screenParserGround
				if !p.valid || !p.private || (b != 'h' && b != 'l') {
					continue
				}
				for _, param := range append(p.params, p.param) {
					if param == 1049 || param == 1047 || param == 47 {
						setAlternate(b == 'h', i+1)
						break
					}
				}
			case b >= 0x20:
				// intermediates and other private markers aren't screen switches
				p.started = true
				p.valid = false
			}
		}
	}
	return changes
}

// stripInteractiveScreen removes the first full-screen app run from consecutive chunks of output.
// Only what was written to the normal screen is kept, and everything after the app exits is left as is.
func stripInteractiveScreen(chunks [][]byte) [][]byte {
	parser := interactiveScreenParser{}
	stripped := make([][]byte, len(chunks))
	exited := false
	// an unfinished sequence at the end of a chunk is held back until we know whether it switches screens
	var held []byte
	for i, chunk := range chunks {
		if exited {
			stripped[i] = chunk
			continue
		}
		alternate := parser.alternate
		kept := []byte{}
		last := 0
		changes := parser.feed(chunk)
		if held != nil {
			if len(changes) == 0 || changes[0].Start > 0 {
				stripped[i-1] = append(stripped[i-1], held...)
			}
			held = nil
		}
		for _, change := range changes {
			if !alternate && change.Start > last {
				kept = append(kept, chunk[last:change.Start]...)
			}
			last = max(last, change.End)
			alternate = change.Alternate
			if !alternate {
				exited = true
				break
			}
		}
		if !alternate {
			if !exited && parser.state != screenParserGround && parser.seqStart >= last {
				held = chunk[parser.seqStart:]
				chunk = chunk[:parser.seqStart]
			}
			kept = append(kept, chunk[last:]...)
		}
		stripped[i] = kept
	}
	if held != nil {
		stripped[len(chunks)-1] = append(stripped[len(chunks)-1], held...)
	}
	return stripped
}

const interactiveScreenRecordingSweepInterval = time.Minute

// splitIncompleteUTF8 holds back a trailing partial character so recorded output stays valid JSON text
func splitIncompleteUTF8(data []byte) ([]byte, []byte) {
	for i := len(data) - 1; i >= 0 && i >= len(data)-utf8.UTFMax; i-- {
		if utf8.RuneStart(data[i]) {
			if !utf8.FullRune(data[i:]) {
				return data[:i], data[i:]
			}
			break
		}
	}
	return data, nil
}

func interactiveScreenCastHeader(cols int, rows int, start time.Time) []byte {
	header, _ := json.Marshal(map[string]interface{}{
		"version":   2,
		"width":     cols,
		"height":    rows,
		"timestamp": start.Unix(),
		"env":       map[string]string{"TERM": "xterm-256color"},
	})
	return append(header, '\n')
}

func interactiveScreenCastEvent(elapsed time.Duration, code string, data string) []byte {
	event, _ := json.Marshal([]interface{}{elapsed.Seconds(), code, data})
	return append(event, '\n')
}

type interactiveScreenSession struct {
	ID         int       `db:"id"`
	TaskID     int       `db:"task_id"`
	StartTime  time.Time `db:"start_time"`
	FilemetaID int       `db:"filemeta_id"`
	Path       string    `db:"path"`
}

type interactiveScreenTask struct {
	sync.Mutex
	parser    interactiveScreenParser
	session   interactiveScreenSession
	utf8Carry []byte
	// output reaches the recording when it's saved, after resizes that arrived later, so times only move forward
	lastEventTime time.Time
}

var interactiveScreenTasks = struct {
	sync.Mutex
	tasks map[int]*interactiveScreenTask
}{tasks: make(map[int]*interactiveScreenTask)}

func getInteractiveScreenTask(taskID int) *interactiveScreenTask {
	interactiveScreenTasks.Lock()
	defer interactiveScreenTasks.Unlock()
	if screenTask, ok := interactiveScreenTasks.tasks[taskID]; ok {
		return screenTask
	}
	screenTask := &interactiveScreenTask{}
	// pick up a session that was still open when mythic_server restarted
	err := database.DB.Get(&screenTask.session, `SELECT
		interactive_screen_session.id, interactive_screen_session.start_time,
		COALESCE(interactive_screen_session.filemeta_id, 0) "filemeta_id", COALESCE(filemeta.path, '') "path"
		FROM interactive_screen_session
		LEFT JOIN filemeta ON interactive_screen_session.filemeta_id = filemeta.id
		WHERE interactive_screen_session.task_id=$1 AND interactive_screen_session.end_time IS NULL
		ORDER BY interactive_screen_session.id DESC LIMIT 1`, taskID)
	if err == nil {
		screenTask.parser.alternate = true
	} else if !errors.Is(err, sql.ErrNoRows) {
		logging.LogError(err, "Failed to look up open interactive screen session", "task_id", taskID)
	}
	interactiveScreenTasks.tasks[taskID] = screenTask
	return screenTask
}

func trackInteractiveScreen(task databaseStructs.Task, responseID int, output []byte, at time.Time) {
	screenTask := getInteractiveScreenTask(task.ID)
	screenTask.Lock()
	defer screenTask.Unlock()
	recorded := false
	for _, change := range screenTask.parser.feed(output) {
		if change.Alternate {
			screenTask.session = startInteractiveScreenSession(task, responseID, at)
			recorded = false
			continue
		}
		if !recorded {
			screenTask.recordOutput(output, at)
			recorded = true
		}
		screenTask.endSession(sql.NullInt64{Int64: int64(responseID), Valid: true})
	}
	if screenTask.session.ID > 0 && !recorded {
		screenTask.recordOutput(output, at)
	}
}

func (screenTask *interactiveScreenTask) recordOutput(output []byte, at time.Time) {
	var data []byte
	data, screenTask.utf8Carry = splitIncompleteUTF8(append(screenTask.utf8Carry, output...))
	screenTask.recordEvent("o", string(data), at)
}

func (screenTask *interactiveScreenTask) recordEvent(code string, data string, at time.Time) {
	if screenTask.session.Path == "" || len(data) == 0 {
		return
	}
	if at.Before(screenTask.lastEventTime) {
		at = screenTask.lastEventTime
	}
	screenTask.lastEventTime = at
	file, err := os.OpenFile(screenTask.session.Path, os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		logging.LogError(err, "Failed to open interactive screen recording", "path", screenTask.session.Path)
		return
	}
	defer file.Close()
	if _, err = file.Write(interactiveScreenCastEvent(at.Sub(screenTask.session.StartTime), code, data)); err != nil {
		logging.LogError(err, "Failed to write interactive screen recording", "path", screenTask.session.Path)
	}
}

func (screenTask *interactiveScreenTask) endSession(responseID sql.NullInt64) {
	if screenTask.session.ID > 0 {
		screenTask.recordEvent("o", string(screenTask.utf8Carry), time.Now().UTC())
		// without an exit sequence the session ends at the task's latest output
		if _, err := database.DB.Exec(`UPDATE interactive_screen_session
			SET end_time=$1, end_response_id=COALESCE($2, (SELECT max(id) FROM response WHERE task_id=interactive_screen_session.task_id))
			WHERE id=$3 AND end_time IS NULL`,
			time.Now().UTC(), responseID, screenTask.session.ID); err != nil {
			logging.LogError(err, "Failed to end interactive screen session", "session_id", screenTask.session.ID)
		}
		// removing the app's output from a long session can take a while, so don't hold up the task's output
		go finalizeInteractiveScreenRecording(screenTask.session.ID, screenTask.session.FilemetaID, screenTask.session.Path)
	}
	screenTask.session = interactiveScreenSession{}
	screenTask.utf8Carry = nil
}

func startInteractiveScreenSession(task databaseStructs.Task, responseID int, start time.Time) interactiveScreenSession {
	session := interactiveScreenSession{StartTime: start}
	cols, rows := 0, 0
	params := ""
	if err := database.DB.Get(&params, `SELECT params FROM task
		WHERE parent_task_id=$1 AND interactive_task_type=$2 ORDER BY id DESC LIMIT 1`,
		task.ID, InteractiveTask.WindowChange); err == nil {
		fmt.Sscanf(params, "%d,%d", &cols, &rows)
	}
	session.FilemetaID, session.Path = createInteractiveScreenRecording(task, cols, rows, session.StartTime)
	filemetaID := sql.NullInt64{Int64: int64(session.FilemetaID), Valid: session.FilemetaID > 0}
	if err := database.DB.Get(&session.ID, `INSERT INTO interactive_screen_session
		(operation_id, task_id, start_response_id, filemeta_id, start_time, cols, "rows")
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		task.OperationID, task.ID, responseID, filemetaID, session.StartTime, cols, rows); err != nil {
		logging.LogError(err, "Failed to start interactive screen session", "task_id", task.ID)
	}
	return session
}

func createInteractiveScreenRecording(task databaseStructs.Task, cols int, rows int, start time.Time) (int, string) {
	taskInfo := databaseStructs.Task{}
	if err := database.DB.Get(&taskInfo, `SELECT
		task.display_id, task.operator_id, callback.host "callback.host"
		FROM task
		JOIN callback ON task.callback_id = callback.id
		WHERE task.id=$1`, task.ID); err != nil {
		logging.LogError(err, "Failed to get task for interactive screen recording", "task_id", task.ID)
		return 0, ""
	}
	agentFileID, path, err := GetSaveFilePath()
	if err != nil {
		logging.LogError(err, "Failed to create interactive screen recording", "task_id", task.ID)
		return 0, ""
	}
	if err = os.WriteFile(path, interactiveScreenCastHeader(cols, rows, start), 0600); err != nil {
		logging.LogError(err, "Failed to write interactive screen recording", "task_id", task.ID)
		return 0, ""
	}
	filemetaID := 0
	if err = database.DB.Get(&filemetaID, `INSERT INTO filemeta
		(agent_file_id, path, filename, total_chunks, chunks_received, delete_after_fetch, operation_id,
		operator_id, task_id, host, comment)
		VALUES ($1, $2, $3, 1, 1, false, $4, $5, $6, $7, $8) RETURNING id`,
		agentFileID, path, []byte(fmt.Sprintf("task_%d_%s.cast", taskInfo.DisplayID, start.Format("20060102_150405"))),
		task.OperationID, taskInfo.OperatorID, task.ID, taskInfo.Callback.Host,
		fmt.Sprintf("Full-screen app recording from task %d", taskInfo.DisplayID)); err != nil {
		logging.LogError(err, "Failed to save interactive screen recording metadata", "task_id", task.ID)
		os.Remove(path)
		return 0, ""
	}
	return filemetaID, path
}

// finalizeInteractiveScreenRecording completes the recording and, now that it holds the full-screen app's
// output, removes that output from the task's responses so it doesn't flood the interactive view's pages
func finalizeInteractiveScreenRecording(sessionID int, filemetaID int, path string) {
	if filemetaID == 0 {
		return
	}
	contents, err := os.ReadFile(path)
	if err != nil {
		logging.LogError(err, "Failed to read interactive screen recording", "path", path)
		return
	}
	completeFile := func(db sqlx.Execer) error {
		_, err := db.Exec(`UPDATE filemeta SET complete=true, size=$1, chunk_size=$2, md5=$3, sha1=$4
			WHERE id=$5`, len(contents), len(contents), fmt.Sprintf("%x", md5.Sum(contents)), fmt.Sprintf("%x", sha1.Sum(contents)),
			filemetaID)
		return err
	}
	if err = collapseInteractiveScreenSession(sessionID, completeFile); err == nil {
		return
	}
	logging.LogError(err, "Failed to remove full-screen app output from responses", "session_id", sessionID)
	if err = completeFile(database.DB); err != nil {
		logging.LogError(err, "Failed to finalize interactive screen recording", "filemeta_id", filemetaID)
	}
}

func collapseInteractiveScreenSession(sessionID int, completeFile func(db sqlx.Execer) error) error {
	transaction, err := database.DB.Beginx()
	if err != nil {
		return err
	}
	defer transaction.Rollback()
	session := struct {
		TaskID          int           `db:"task_id"`
		StartResponseID sql.NullInt64 `db:"start_response_id"`
		EndResponseID   sql.NullInt64 `db:"end_response_id"`
	}{}
	if err = transaction.Get(&session, `SELECT task_id, start_response_id, end_response_id
		FROM interactive_screen_session WHERE id=$1 AND end_time IS NOT NULL AND NOT collapsed FOR UPDATE`,
		sessionID); errors.Is(err, sql.ErrNoRows) {
		// already collapsed by the cleanup sweep
		return nil
	} else if err != nil {
		return err
	}
	if session.StartResponseID.Valid && session.EndResponseID.Valid {
		responses := []databaseStructs.Response{}
		if err = transaction.Select(&responses, `SELECT id, response FROM response
			WHERE task_id=$1 AND id>=$2 AND id<=$3 AND interactive_task_type IN ($4, $5)
			ORDER BY id FOR UPDATE`, session.TaskID, session.StartResponseID.Int64, session.EndResponseID.Int64,
			InteractiveTask.Output, InteractiveTask.Error); err != nil {
			return err
		}
		chunks := make([][]byte, len(responses))
		for i := range responses {
			chunks[i] = responses[i].Response
		}
		deleted := []int{}
		for i, chunk := range stripInteractiveScreen(chunks) {
			// the first response stays, even if empty, so the session still points at where the app ran
			if i > 0 && len(chunk) == 0 {
				deleted = append(deleted, responses[i].ID)
			} else if !bytes.Equal(chunk, responses[i].Response) {
				if _, err = transaction.Exec(`UPDATE response SET response=$1 WHERE id=$2`, chunk, responses[i].ID); err != nil {
					return err
				}
			}
		}
		if len(deleted) > 0 {
			if _, err = transaction.Exec(`DELETE FROM response WHERE id = ANY($1)`, pq.Array(deleted)); err != nil {
				return err
			}
			if _, err = transaction.Exec(`UPDATE task SET response_count=GREATEST(response_count-$1, 0) WHERE id=$2`,
				len(deleted), session.TaskID); err != nil {
				return err
			}
		}
	}
	if _, err = transaction.Exec(`UPDATE interactive_screen_session SET collapsed=true WHERE id=$1`, sessionID); err != nil {
		return err
	}
	if err = completeFile(transaction); err != nil {
		return err
	}
	return transaction.Commit()
}

// finalize recordings whose session was closed by the task completing rather than by mythic_server
func finalizeClosedInteractiveScreenRecordings() {
	recordings := []interactiveScreenSession{}
	if err := database.DB.Select(&recordings, `SELECT
		interactive_screen_session.id, interactive_screen_session.task_id, interactive_screen_session.start_time,
		filemeta.id "filemeta_id", filemeta.path
		FROM interactive_screen_session
		JOIN filemeta ON interactive_screen_session.filemeta_id = filemeta.id
		WHERE interactive_screen_session.end_time IS NOT NULL AND filemeta.complete=false`); err != nil {
		logging.LogError(err, "Failed to find unfinished interactive screen recordings")
		return
	}
	for _, recording := range recordings {
		forgetInteractiveScreenSession(recording.TaskID, recording.ID)
		finalizeInteractiveScreenRecording(recording.ID, recording.FilemetaID, recording.Path)
	}
}

// stop recording a session that was closed in the database, e.g. by its task completing
func forgetInteractiveScreenSession(taskID int, sessionID int) {
	interactiveScreenTasks.Lock()
	defer interactiveScreenTasks.Unlock()
	screenTask, ok := interactiveScreenTasks.tasks[taskID]
	if !ok {
		return
	}
	screenTask.Lock()
	defer screenTask.Unlock()
	if screenTask.session.ID == sessionID {
		delete(interactiveScreenTasks.tasks, taskID)
	}
}

func startInteractiveScreenRecordingCleanup() {
	finalizeClosedInteractiveScreenRecordings()
	ticker := time.NewTicker(interactiveScreenRecordingSweepInterval)
	defer ticker.Stop()
	for range ticker.C {
		finalizeClosedInteractiveScreenRecordings()
		forgetIdleInteractiveLiveTasks()
	}
}

func recordInteractiveScreenResize(taskID int, params string) {
	interactiveScreenTasks.Lock()
	screenTask, ok := interactiveScreenTasks.tasks[taskID]
	interactiveScreenTasks.Unlock()
	if !ok {
		return
	}
	cols, rows := 0, 0
	if _, err := fmt.Sscanf(params, "%d,%d", &cols, &rows); err != nil {
		return
	}
	screenTask.Lock()
	defer screenTask.Unlock()
	if screenTask.session.ID > 0 {
		screenTask.recordEvent("r", fmt.Sprintf("%dx%d", cols, rows), time.Now().UTC())
	}
}

func endInteractiveScreenTask(taskID int) {
	interactiveScreenTasks.Lock()
	screenTask, ok := interactiveScreenTasks.tasks[taskID]
	delete(interactiveScreenTasks.tasks, taskID)
	interactiveScreenTasks.Unlock()
	if ok {
		screenTask.Lock()
		screenTask.endSession(sql.NullInt64{})
		screenTask.Unlock()
	}
	if _, err := database.DB.Exec(`UPDATE interactive_screen_session
		SET end_time=$1, end_response_id=(SELECT max(id) FROM response WHERE task_id=$2)
		WHERE task_id=$2 AND end_time IS NULL`, time.Now().UTC(), taskID); err != nil {
		logging.LogError(err, "Failed to end interactive screen sessions", "task_id", taskID)
	}
	finalizeClosedInteractiveScreenRecordings()
}

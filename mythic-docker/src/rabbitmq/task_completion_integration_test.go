package rabbitmq

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/jmoiron/sqlx"
	amqp "github.com/rabbitmq/amqp091-go"
)

// Set MYTHIC_COMPLETION_TEST_DATABASE_URL to an expendable PostgreSQL database.
// Each run uses a private schema; no RabbitMQ service or running Mythic is needed.
func TestTaskCompletionIntegration(t *testing.T) {
	dsn := os.Getenv("MYTHIC_COMPLETION_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set MYTHIC_COMPLETION_TEST_DATABASE_URL to run PostgreSQL completion regressions")
	}
	admin, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := fmt.Sprintf("completion_test_%d", time.Now().UnixNano())
	admin.MustExec(`CREATE SCHEMA ` + schema)
	defer admin.MustExec(`DROP SCHEMA ` + schema + ` CASCADE`)
	parsed, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	query := parsed.Query()
	query.Set("search_path", schema)
	parsed.RawQuery = query.Encode()
	db, err := sqlx.Connect("postgres", parsed.String())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	previousDB := database.DB
	database.DB = db
	defer func() { database.DB = previousDB }()
	db.MustExec(`CREATE TABLE command (id integer PRIMARY KEY, script_only boolean NOT NULL);
        CREATE TABLE apitokens (id integer PRIMARY KEY, task_id integer,
            active boolean NOT NULL DEFAULT true, deleted boolean NOT NULL DEFAULT false,
            scopes text[] NOT NULL DEFAULT '{}');
        CREATE TABLE task (
            id integer PRIMARY KEY, parent_task_id integer, command_id integer DEFAULT 1,
            operation_id integer NOT NULL DEFAULT 7, operator_id integer NOT NULL DEFAULT 3,
            eventstepinstance_id integer, apitokens_id integer,
            completed boolean NOT NULL DEFAULT true, status text NOT NULL DEFAULT 'success',
            status_timestamp_processed timestamp, timestamp timestamp NOT NULL DEFAULT now(),
            completed_callback_function text NOT NULL DEFAULT '',
            completed_callback_function_started boolean NOT NULL DEFAULT false,
            completed_callback_function_completed boolean NOT NULL DEFAULT false,
            subtask_callback_function text NOT NULL DEFAULT '',
            subtask_callback_function_started boolean NOT NULL DEFAULT false,
            subtask_callback_function_completed boolean NOT NULL DEFAULT false,
            subtask_group_name text NOT NULL DEFAULT '', group_callback_function text NOT NULL DEFAULT '',
            group_callback_function_started boolean NOT NULL DEFAULT false,
            group_callback_function_completed boolean NOT NULL DEFAULT false,
            stdout text NOT NULL DEFAULT '', stderr text NOT NULL DEFAULT '',
            params text NOT NULL DEFAULT '', parameter_group_name text NOT NULL DEFAULT 'Default',
            display_params text NOT NULL DEFAULT '');`)
	auth := RabbitMQAuthContext{OperationID: 7, OperatorID: 3, SourceScopes: []string{authorization.SCOPE_TASK_WRITE}}
	reset := func() {
		db.MustExec(`TRUNCATE task, command, apitokens; INSERT INTO command VALUES (1, true)`)
		drainEventingChannelForTest()
	}
	waitFor := func(check func() bool) {
		t.Helper()
		deadline := time.Now().Add(3 * time.Second)
		for !check() {
			if time.Now().After(deadline) {
				t.Fatal("completion processing did not reach the expected state")
			}
			time.Sleep(time.Millisecond)
		}
		// Wait for the processing that made the final change to release its lock.
		completionMutex.Lock()
		completionMutex.Unlock()
	}
	boolQuery := func(query string, args ...interface{}) bool {
		var value bool
		if err := db.Get(&value, query, args...); err != nil {
			t.Fatal(err)
		}
		return value
	}
	deliver := func(response PTTaskCompletionFunctionMessageResponse) {
		body, err := json.Marshal(response)
		if err != nil {
			t.Fatal(err)
		}
		processPtTaskCompletionFunctionMessages(amqp.Delivery{Body: body,
			Headers: amqp.Table{"mythic_resolved_authorization": auth}})
	}

	respond := func(taskID, parentID int, success bool) {
		deliver(PTTaskCompletionFunctionMessageResponse{TaskID: taskID, ParentTaskId: parentID, Success: success})
	}

	t.Run("empty_or_wrong_operation_cannot_process_task", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id) VALUES (1); INSERT INTO apitokens (id, task_id) VALUES (1, 1)`)
		CheckAndProcessTaskCompletionHandlers(1, RabbitMQAuthContext{})
		wrongOperation := auth
		wrongOperation.OperationID = 8
		CheckAndProcessTaskCompletionHandlers(1, wrongOperation)
		CheckAndProcessTaskCompletionHandlers(1, RabbitMQAuthContext{OperationID: 7, OperatorID: 3})
		if !boolQuery(`SELECT active FROM apitokens WHERE id=1`) {
			t.Fatal("unauthorized completion expired a task token")
		}
	})

	t.Run("reconstructed_context_preserves_token_ceiling", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO apitokens (id, scopes) VALUES (5, '{task.write}');
            INSERT INTO task (id, apitokens_id, eventstepinstance_id) VALUES (1, 5, 9)`)
		context, err := GetRabbitMQAuthContextForTaskID(1)
		if err != nil {
			t.Fatal(err)
		}
		if context.APITokensID != 5 || context.EventStepInstanceID != 9 ||
			context.ScopeSet()[authorization.SCOPE_ALL] || !context.ScopeSet()[authorization.SCOPE_TASK_WRITE] {
			t.Fatalf("lost stored authority: %#v", context)
		}
	})

	t.Run("parent_waits_for_each_kind_of_child_handler", func(t *testing.T) {
		for _, stage := range []string{"completed", "subtask", "group"} {
			t.Run(stage, func(t *testing.T) {
				reset()
				db.MustExec(`INSERT INTO task (id, completed, status) VALUES (1, false, $1)`, PT_TASK_FUNCTION_STATUS_DELEGATING)
				db.MustExec(`INSERT INTO task (id, parent_task_id) VALUES (2, 1), (3, 1)`)
				column := stage + "_callback_function"
				db.MustExec(`UPDATE task SET ` + column + `='handler', ` + column + `_started=true WHERE id=2`)
				if stage == "group" {
					db.MustExec(`UPDATE task SET subtask_group_name='batch' WHERE id=2`)
				}
				CheckAndProcessTaskCompletionHandlers(3, auth)
				if boolQuery(`SELECT completed FROM task WHERE id=1`) {
					t.Fatal("parent completed while a child handler was still pending")
				}
				db.MustExec(`UPDATE task SET ` + column + `_completed=true WHERE id=2`)
				CheckAndProcessTaskCompletionHandlers(3, auth)
				waitFor(func() bool { return boolQuery(`SELECT completed FROM task WHERE id=1`) })
				select {
				case event := <-EventingChannel:
					if event.TaskID != 1 || !event.ActionSuccess {
						t.Fatalf("unexpected finish event: %#v", event)
					}
				case <-time.After(time.Second):
					t.Fatal("script-only parent did not emit a finish event")
				}
			})
		}
	})

	t.Run("completed_parent_still_waits_for_child_handlers", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id) VALUES (1);
            INSERT INTO task (id, parent_task_id) VALUES (2, 1), (3, 1);
            UPDATE task SET completed_callback_function='ownDone', completed_callback_function_started=true WHERE id=3;
            INSERT INTO apitokens (id, task_id) VALUES (1, 1)`)
		CheckAndProcessTaskCompletionHandlers(1, auth)
		CheckAndProcessTaskCompletionHandlers(2, auth)
		if !boolQuery(`SELECT active FROM apitokens WHERE id=1`) {
			t.Fatal("completed parent advanced while a child handler was still running")
		}
		db.MustExec(`UPDATE task SET completed_callback_function_completed=true WHERE id=3`)
		CheckAndProcessTaskCompletionHandlers(3, auth)
		waitFor(func() bool { return !boolQuery(`SELECT active FROM apitokens WHERE id=1`) })
	})

	t.Run("nested_script_parents_continue_and_clean_up", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id, completed, status) VALUES (1, false, $1), (2, false, $1)`, PT_TASK_FUNCTION_STATUS_DELEGATING)
		db.MustExec(`INSERT INTO task (id, parent_task_id) VALUES (3, 2);
            UPDATE task SET parent_task_id=1 WHERE id=2`)
		db.MustExec(`INSERT INTO apitokens (id, task_id) VALUES (1, 1), (2, 2), (3, 3)`)
		CheckAndProcessTaskCompletionHandlers(3, auth)
		waitFor(func() bool {
			return boolQuery(`SELECT bool_and(completed) FROM task`) &&
				boolQuery(`SELECT bool_and(NOT active AND deleted) FROM apitokens`)
		})
		for range 2 {
			select {
			case <-EventingChannel:
			case <-time.After(time.Second):
				t.Fatal("nested parent finish event missing")
			}
		}
	})

	t.Run("group_waits_for_child_handlers_and_updates_only_its_members", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id) VALUES (1);
            INSERT INTO task (id, parent_task_id, subtask_group_name, group_callback_function)
            VALUES (2, 1, 'batch', 'groupDone'), (3, 1, 'batch', 'groupDone'), (4, 2, 'batch', '');
            UPDATE task SET status='error: agent failed' WHERE id=3;
            UPDATE task SET completed_callback_function='ownDone', completed_callback_function_started=true WHERE id=2`)
		if claimGroupCompletionFunctionStart(1, "batch", "groupDone") {
			t.Fatal("group started before a child's completion function finished")
		}
		db.MustExec(`UPDATE task SET completed_callback_function_completed=true,
            subtask_callback_function='childDone', subtask_callback_function_started=true WHERE id=2`)
		if claimGroupCompletionFunctionStart(1, "batch", "groupDone") {
			t.Fatal("group started before a child's subtask callback finished")
		}
		db.MustExec(`UPDATE task SET subtask_callback_function_completed=true WHERE id=2`)
		if !claimGroupCompletionFunctionStart(1, "batch", "groupDone") || claimGroupCompletionFunctionStart(1, "batch", "groupDone") {
			t.Fatal("ready group must be claimed exactly once")
		}
		db.MustExec(`INSERT INTO apitokens (id, task_id) VALUES (2, 2), (3, 3)`)
		respond(2, 1, true)
		waitFor(func() bool { return boolQuery(`SELECT bool_and(NOT active) FROM apitokens`) })
		if !boolQuery(`SELECT bool_and(group_callback_function_completed AND position('succeeded' in stdout)>0) FROM task WHERE id IN (2,3)`) {
			t.Fatal("group success did not complete both siblings")
		}
		if !boolQuery(`SELECT status='error: agent failed' FROM task WHERE id=3`) {
			t.Fatal("group success replaced a member's agent failure status")
		}
		if boolQuery(`SELECT group_callback_function_completed FROM task WHERE id=4`) {
			t.Fatal("group success modified a grandchild with the same group name")
		}
	})

	t.Run("failed_handler_keeps_parent_blocked_and_retires_tokens", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id, completed, status) VALUES (1, false, $1)`, PT_TASK_FUNCTION_STATUS_DELEGATING)
		db.MustExec(`INSERT INTO task (id, parent_task_id, completed_callback_function, completed_callback_function_started)
            VALUES (2, 1, 'ownDone', true);
            INSERT INTO task (id, parent_task_id) VALUES (3, 1);
            INSERT INTO apitokens (id, task_id) VALUES (2, 2)`)
		CheckAndProcessTaskCompletionHandlers(2, auth)
		if !boolQuery(`SELECT active FROM apitokens WHERE id=2`) {
			t.Fatal("task token expired while its completion handler was running")
		}
		respond(2, 0, false)
		CheckAndProcessTaskCompletionHandlers(2, auth)
		CheckAndProcessTaskCompletionHandlers(3, auth)
		if boolQuery(`SELECT completed_callback_function_completed FROM task WHERE id=2`) ||
			boolQuery(`SELECT completed FROM task WHERE id=1`) || boolQuery(`SELECT active FROM apitokens WHERE id=2`) {
			t.Fatal("failed completion was treated as a successful finished handler")
		}
	})

	t.Run("failed_group_retires_all_tokens_and_can_be_retried_from_parent", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id, completed, status) VALUES (1, false, $1)`, PT_TASK_FUNCTION_STATUS_DELEGATING)
		db.MustExec(`INSERT INTO task (id, parent_task_id, subtask_group_name, group_callback_function,
            group_callback_function_started) VALUES (2, 1, 'batch', 'groupDone', true), (3, 1, 'batch', 'groupDone', true);
            INSERT INTO apitokens (id, task_id) VALUES (2, 2), (3, 3)`)
		respond(2, 1, false)
		if !boolQuery(`SELECT bool_and(NOT active AND deleted) FROM apitokens`) ||
			!boolQuery(`SELECT bool_and(NOT group_callback_function_completed AND group_callback_function_started
                AND status='success' AND position('failed' in stderr)>0) FROM task WHERE parent_task_id=1`) {
			t.Fatal("failed group did not retire every member's tokens and preserve its failure")
		}
		if !boolQuery(`SELECT NOT completed AND status=$1 FROM task WHERE id=1`, PT_TASK_FUNCTION_STATUS_DELEGATING) {
			t.Fatal("handler failure changed the parent's task lifecycle")
		}
		if _, err := resetChildTaskCompletionHandlerForRetry(databaseStructs.Task{ID: 1, OperationID: 7}, false); err != nil {
			t.Fatal(err)
		}
		if !claimGroupCompletionFunctionStart(1, "batch", "groupDone") {
			t.Fatal("group was not claimable after resetting the failed handler")
		}
	})

	t.Run("issue_610_handler_results_preserve_agent_status_and_output", func(t *testing.T) {
		for _, stage := range []string{"completed", "subtask", "group"} {
			for _, status := range []string{"success", "error: agent failed", "custom agent outcome"} {
				for _, success := range []bool{true, false} {
					t.Run(fmt.Sprintf("%s/%s/handler_%t", stage, status, success), func(t *testing.T) {
						reset()
						db.MustExec(`INSERT INTO task (id, display_id, status, stdout, stderr) VALUES (1, 1, 'parent outcome', 'parent out', 'parent err')`)
						db.MustExec(`INSERT INTO task (id, display_id, parent_task_id, status, stdout, stderr) VALUES (2, 2, 1, $1, 'agent out', 'agent err')`, status)
						column := stage + "_callback_function"
						db.MustExec(`UPDATE task SET ` + column + `='handler' WHERE id=2`)
						parentID := 1
						if stage == "group" {
							db.MustExec(`UPDATE task SET subtask_group_name='batch' WHERE id=2`)
							if !claimGroupCompletionFunctionStart(1, "batch", "handler") {
								t.Fatal("failed to claim group")
							}
						} else {
							if !updateStdOutWithTaskCompletionFunctionStart(2, 2, column+"_started", column+"_completed", column, stage) {
								t.Fatal("failed to claim handler")
							}
							if updateStdOutWithTaskCompletionFunctionStart(2, 2, column+"_started", column+"_completed", column, stage) {
								t.Fatal("duplicate claim succeeded")
							}
							if stage == "completed" {
								parentID = 0
							}
						}
						if !boolQuery(`SELECT status=$1 FROM task WHERE id=2`, status) {
							t.Fatal("starting a handler replaced the agent outcome")
						}
						out, errOut := "handler out", "handler err"
						deliver(PTTaskCompletionFunctionMessageResponse{
							TaskID: 2, ParentTaskId: parentID, Success: success, Stdout: &out, Stderr: &errOut,
						})
						var task, parent databaseStructs.Task
						if err := db.Get(&task, `SELECT * FROM task WHERE id=2`); err != nil {
							t.Fatal(err)
						}
						if err := db.Get(&parent, `SELECT * FROM task WHERE id=1`); err != nil {
							t.Fatal(err)
						}
						if task.Status != status || parent.Status != "parent outcome" ||
							!strings.HasPrefix(task.Stdout, "agent out") || !strings.HasPrefix(task.Stderr, "agent err") {
							t.Fatalf("handler replaced agent outcome or output: %#v", task)
						}
						target := task
						if parentID != 0 {
							target = parent
						}
						if !strings.HasSuffix(target.Stdout, out) || !strings.HasSuffix(target.Stderr, errOut) {
							t.Fatalf("returned output did not reach the executing task: %#v", target)
						}
						if (success && !strings.Contains(task.Stdout, "succeeded")) || (!success && !strings.Contains(task.Stderr, "failed")) {
							t.Fatal("handler verdict missing from output")
						}
						if _, err := resetTaskCompletionHandlerForRetry(task, false); err != nil {
							t.Fatal(err)
						}
						if !boolQuery(`SELECT status=$1 FROM task WHERE id=2`, status) {
							t.Fatal("retry changed the agent outcome")
						}
					})
				}
			}
		}
	})

	t.Run("explicit_handler_status_overrides_still_target_the_executing_task", func(t *testing.T) {
		for _, parentID := range []int{0, 1} {
			reset()
			db.MustExec(`INSERT INTO task (id, status) VALUES (1, 'parent outcome');
                INSERT INTO task (id, parent_task_id, status) VALUES (2, 1, 'agent outcome')`)
			column := "completed_callback_function"
			if parentID != 0 {
				column = "subtask_callback_function"
			}
			db.MustExec(`UPDATE task SET ` + column + `='handler', ` + column + `_started=true WHERE id=2`)
			status := "explicit handler override"
			deliver(PTTaskCompletionFunctionMessageResponse{TaskID: 2, ParentTaskId: parentID, Success: true, TaskStatus: &status})
			targetID := 2
			if parentID != 0 {
				targetID = 1
			}
			if !boolQuery(`SELECT status=$2 FROM task WHERE id=$1`, targetID, status) {
				t.Fatal("explicit override was lost")
			}
		}
	})

	t.Run("retry_prefers_unfinished_stage_over_earlier_success", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id, status, completed_callback_function, completed_callback_function_started,
                completed_callback_function_completed, subtask_callback_function, subtask_callback_function_started)
                VALUES (1, 'agent error', 'ownDone', true, true, 'childDone', true)`)
		var task databaseStructs.Task
		if err := db.Get(&task, `SELECT * FROM task WHERE id=1`); err != nil {
			t.Fatal(err)
		}
		if _, err := resetTaskCompletionHandlerForRetry(task, false); err != nil {
			t.Fatal(err)
		}
		if !boolQuery(`SELECT completed_callback_function_completed AND NOT subtask_callback_function_started AND status='agent error' FROM task WHERE id=1`) {
			t.Fatal("retry reset the wrong stage or changed agent status")
		}
	})

	t.Run("parent_retry_prefers_unfinished_child_over_successful_child", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id, completed_callback_function, completed_callback_function_started, completed_callback_function_completed)
                VALUES (1, 'parentDone', true, true);
            INSERT INTO task (id, parent_task_id, completed_callback_function, completed_callback_function_started, completed_callback_function_completed)
            VALUES (2, 1, 'unfinished', true, false), (3, 1, 'finished', true, true)`)
		var parent databaseStructs.Task
		if err := db.Get(&parent, `SELECT * FROM task WHERE id=1`); err != nil {
			t.Fatal(err)
		}
		if _, err := resetTaskCompletionHandlerForRetry(parent, true); err == nil {
			t.Fatal("successful parent was selected ahead of an unfinished child")
		}
		id, err := resetChildTaskCompletionHandlerForRetry(parent, true)
		if err != nil || id != 2 {
			t.Fatalf("retry selected %d, %v; want unfinished child 2", id, err)
		}
	})

	t.Run("late_agent_output_appends_without_erasing_handler_diagnostics", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id, status, stdout, stderr) VALUES (1, 'agent error', 'old agent out', 'old agent err')`)
		appendTaskCompletionOutput(1, " handler success", " handler failure")
		transitioned, err := updateAgentMessagePostResponseTask(databaseStructs.Task{
			ID: 1, Status: "late status", Completed: true, Stdout: " new agent out", Stderr: " new agent err",
		})
		if err != nil || transitioned {
			t.Fatalf("late agent update failed: %v, %t", err, transitioned)
		}
		if !boolQuery(`SELECT status='agent error' AND stdout='old agent out handler success new agent out'
            AND stderr='old agent err handler failure new agent err' FROM task WHERE id=1`) {
			t.Fatal("late agent packet replaced completion diagnostics or status")
		}
	})

	t.Run("response_saves_parent_before_dispatch_can_advance_it", func(t *testing.T) {
		reset()
		db.MustExec(`INSERT INTO task (id, completed, status) VALUES (1, false, $1)`, PT_TASK_FUNCTION_STATUS_DELEGATING)
		db.MustExec(`INSERT INTO task (id, parent_task_id, subtask_callback_function, subtask_callback_function_started)
            VALUES (2, 1, 'childDone', true);
            INSERT INTO apitokens (id, task_id) VALUES (2, 2)`)
		tx := db.MustBegin()
		defer tx.Rollback()
		tx.MustExec(`SELECT id FROM task WHERE id=1 FOR UPDATE`)
		responseDone := make(chan struct{})
		go func() { defer close(responseDone); respond(2, 1, true) }()
		// The child's update is visible while the parent's update waits on our row lock.
		deadline := time.Now().Add(3 * time.Second)
		for !boolQuery(`SELECT subtask_callback_function_completed FROM task WHERE id=2`) {
			if time.Now().After(deadline) {
				t.Fatal("response did not reach the parent write")
			}
			time.Sleep(time.Millisecond)
		}
		if completionMutex.TryLock() {
			completionMutex.Unlock()
			t.Fatal("response released the completion lock before saving the parent")
		}
		if err := tx.Commit(); err != nil {
			t.Fatal(err)
		}
		<-responseDone
		waitFor(func() bool {
			return boolQuery(`SELECT completed FROM task WHERE id=1`) && !boolQuery(`SELECT active FROM apitokens WHERE id=2`)
		})
		select {
		case <-EventingChannel:
		case <-time.After(time.Second):
			t.Fatal("parent did not advance after the response finished writing")
		}
	})

	t.Run("restart_records_interrupted_handlers_without_changing_status", func(t *testing.T) {
		reset()
		for i, stage := range []string{"completed", "subtask", "group"} {
			column := stage + "_callback_function"
			db.MustExec(`INSERT INTO task (id, status, `+column+`, `+column+`_started) VALUES ($1, 'error: agent failed', 'handler', true)`, i+1)
		}
		db.MustExec(`INSERT INTO task (id, completed_callback_function_started, completed_callback_function_completed) VALUES (4, true, true)`)
		markInterruptedTaskCompletionHandlers()
		var tasks []databaseStructs.Task
		if err := db.Select(&tasks, `SELECT * FROM task ORDER BY id`); err != nil {
			t.Fatal(err)
		}
		for _, task := range tasks[:3] {
			if task.Status != "error: agent failed" || !strings.Contains(task.Stderr, "server restart") || !strings.Contains(task.Stderr, "handler") {
				t.Fatalf("restart lost agent status or handler context: %#v", task)
			}
		}
		if tasks[3].Status != PT_TASK_FUNCTION_STATUS_COMPLETED || tasks[3].Stderr != "" {
			t.Fatal("restart changed an already completed handler")
		}
	})
}

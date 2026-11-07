package rabbitmq

import (
	"fmt"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

type fakeInteractiveLiveViewer struct {
	sync.Mutex
	events []string
	refuse bool
}

func (viewer *fakeInteractiveLiveViewer) InteractiveOutput(messageType InteractiveTask.MessageType, data []byte) bool {
	viewer.Lock()
	defer viewer.Unlock()
	viewer.events = append(viewer.events, fmt.Sprintf("%d:%s", messageType, data))
	return !viewer.refuse
}

func (viewer *fakeInteractiveLiveViewer) InteractiveSaved(responseID int) bool {
	viewer.Lock()
	defer viewer.Unlock()
	viewer.events = append(viewer.events, fmt.Sprintf("saved %d", responseID))
	return !viewer.refuse
}

func (viewer *fakeInteractiveLiveViewer) InteractiveSize(size InteractiveLiveSize) bool {
	viewer.Lock()
	defer viewer.Unlock()
	viewer.events = append(viewer.events, fmt.Sprintf("size %dx%d", size.Cols, size.Rows))
	return !viewer.refuse
}

func (viewer *fakeInteractiveLiveViewer) getEvents() []string {
	viewer.Lock()
	defer viewer.Unlock()
	return slices.Clone(viewer.events)
}

type savedInteractiveLiveResponse struct {
	messageType int64
	data        string
}

// newTestInteractiveLiveTask replaces saving to the database and the screen recorder for the test
func newTestInteractiveLiveTask(t *testing.T) (*interactiveLiveTask, *fakeInteractiveLiveViewer, func() []savedInteractiveLiveResponse, func() []int) {
	var lock sync.Mutex
	saved := []savedInteractiveLiveResponse{}
	tracked := []int{}
	originalInsert, originalTrack := insertInteractiveLiveResponse, trackInteractiveLiveScreen
	insertInteractiveLiveResponse = func(response *databaseStructs.Response) error {
		lock.Lock()
		defer lock.Unlock()
		saved = append(saved, savedInteractiveLiveResponse{messageType: response.InteractiveTaskType.Int64, data: string(response.Response)})
		response.ID = len(saved)
		return nil
	}
	trackInteractiveLiveScreen = func(task databaseStructs.Task, responseID int, output []byte, at time.Time) {
		lock.Lock()
		defer lock.Unlock()
		tracked = append(tracked, responseID)
	}
	t.Cleanup(func() {
		insertInteractiveLiveResponse, trackInteractiveLiveScreen = originalInsert, originalTrack
	})
	viewer := &fakeInteractiveLiveViewer{}
	liveTask := &interactiveLiveTask{
		task:    databaseStructs.Task{ID: 1, OperationID: 1},
		viewers: map[InteractiveLiveViewer]bool{viewer: true},
		sizes:   map[InteractiveLiveViewer]InteractiveLiveSize{},
	}
	return liveTask, viewer, func() []savedInteractiveLiveResponse {
			lock.Lock()
			defer lock.Unlock()
			return slices.Clone(saved)
		}, func() []int {
			lock.Lock()
			defer lock.Unlock()
			return slices.Clone(tracked)
		}
}

func TestInteractiveLiveSendsOutputBeforeSavingIt(t *testing.T) {
	liveTask, viewer, saved, tracked := newTestInteractiveLiveTask(t)
	liveTask.addOutput(InteractiveTask.Output, []byte("a"))
	liveTask.addOutput(InteractiveTask.Output, []byte("b"))
	if got := viewer.getEvents(); !slices.Equal(got, []string{"1:a", "1:b"}) {
		t.Fatalf("viewer events = %q", got)
	}
	if len(saved()) != 0 {
		t.Fatalf("saved before the batch was due: %v", saved())
	}
	deadline := time.Now().Add(time.Second)
	for len(saved()) == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if got := saved(); !slices.Equal(got, []savedInteractiveLiveResponse{{messageType: int64(InteractiveTask.Output), data: "ab"}}) {
		t.Fatalf("saved = %v", got)
	}
	if got := viewer.getEvents(); !slices.Equal(got, []string{"1:a", "1:b", "saved 1"}) {
		t.Fatalf("viewer events = %q", got)
	}
	// each piece reaches the recording on its own, in the response it was saved in
	if got := tracked(); !slices.Equal(got, []int{1, 1}) {
		t.Fatalf("tracked = %v", got)
	}
}

func TestInteractiveLiveSavesWhenTheTypeChanges(t *testing.T) {
	liveTask, viewer, saved, _ := newTestInteractiveLiveTask(t)
	liveTask.addOutput(InteractiveTask.Output, []byte("out"))
	liveTask.addOutput(InteractiveTask.Error, []byte("err"))
	liveTask.addOutput(InteractiveTask.Exit, []byte("bye"))
	want := []savedInteractiveLiveResponse{
		{messageType: int64(InteractiveTask.Output), data: "out"},
		{messageType: int64(InteractiveTask.Error), data: "err"},
		{messageType: int64(InteractiveTask.Exit), data: "bye"},
	}
	if got := saved(); !slices.Equal(got, want) {
		t.Fatalf("saved = %v", got)
	}
	if got := viewer.getEvents(); !slices.Equal(got, []string{"1:out", "saved 1", "2:err", "saved 2", "3:bye", "saved 3"}) {
		t.Fatalf("viewer events = %q", got)
	}
}

func TestInteractiveLiveSavesLargeBatchesStraightAway(t *testing.T) {
	liveTask, _, saved, _ := newTestInteractiveLiveTask(t)
	liveTask.addOutput(InteractiveTask.Output, []byte(strings.Repeat("x", interactiveLiveSaveSize-1)))
	if len(saved()) != 0 {
		t.Fatal("saved before reaching the size limit")
	}
	liveTask.addOutput(InteractiveTask.Output, []byte("y"))
	if got := saved(); len(got) != 1 || len(got[0].data) != interactiveLiveSaveSize {
		t.Fatalf("saved %d responses", len(got))
	}
}

func TestInteractiveLiveDropsViewersThatRefuseOutput(t *testing.T) {
	liveTask, viewer, _, _ := newTestInteractiveLiveTask(t)
	viewer.refuse = true
	liveTask.addOutput(InteractiveTask.Output, []byte("a"))
	liveTask.addOutput(InteractiveTask.Output, []byte("b"))
	if got := viewer.getEvents(); !slices.Equal(got, []string{"1:a"}) {
		t.Fatalf("viewer events = %q", got)
	}
}

func TestInteractiveLiveSizesTheTerminalToFitEveryone(t *testing.T) {
	liveTask, watcher, _, _ := newTestInteractiveLiveTask(t)
	small, large := &fakeInteractiveLiveViewer{}, &fakeInteractiveLiveViewer{}
	resize := func(viewer InteractiveLiveViewer, size *InteractiveLiveSize) string {
		owner, newSize, changed := liveTask.setViewerSize(viewer, size)
		if !changed {
			return "unchanged"
		}
		return fmt.Sprintf("%dx%d by %s", newSize.Cols, newSize.Rows, map[InteractiveLiveViewer]string{small: "small", large: "large"}[owner])
	}
	if got := resize(large, &InteractiveLiveSize{Cols: 200, Rows: 50}); got != "200x50 by large" {
		t.Fatalf("first viewer: %s", got)
	}
	// each dimension is the smallest anyone asked for
	if got := resize(small, &InteractiveLiveSize{Cols: 80, Rows: 60}); got != "80x50 by small" {
		t.Fatalf("second viewer: %s", got)
	}
	if got := resize(large, &InteractiveLiveSize{Cols: 220, Rows: 50}); got != "unchanged" {
		t.Fatalf("growing past the smallest: %s", got)
	}
	// once the smallest viewer leaves, the terminal grows and is resized as someone still there
	if got := resize(small, nil); got != "220x50 by large" {
		t.Fatalf("smallest left: %s", got)
	}
	if got := resize(large, nil); got != "unchanged" {
		t.Fatalf("last viewer left: %s", got)
	}
	// everyone watching is told, whether or not they size it
	if got := watcher.getEvents(); !slices.Equal(got, []string{"size 200x50", "size 80x50", "size 220x50"}) {
		t.Fatalf("watcher events = %q", got)
	}
}

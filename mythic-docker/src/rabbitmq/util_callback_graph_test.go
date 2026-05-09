package rabbitmq

import (
	"fmt"
	"testing"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

const testC2ProfileName = "test-c2"

func newTestCallbackGraph(t *testing.T) *cbGraph {
	t.Helper()
	previousC2ProfileNameToIDMap := c2profileNameToIdMap
	BFSCache.Reset()
	c2profileNameToIdMap = map[string]databaseStructs.C2profile{
		testC2ProfileName: {
			ID:    1,
			Name:  testC2ProfileName,
			IsP2p: false,
		},
	}
	t.Cleanup(func() {
		BFSCache.Reset()
		c2profileNameToIdMap = previousC2ProfileNameToIDMap
	})
	return &cbGraph{
		adjMatrix: make(map[int][]cbGraphAdjMatrixEntry),
	}
}

func testCallback(id int) databaseStructs.Callback {
	return databaseStructs.Callback{
		ID:              id,
		AgentCallbackID: fmt.Sprintf("callback-%d", id),
	}
}

func addTestGraphEdge(graph *cbGraph, sourceID int, destinationID int) {
	graph.Add(testCallback(sourceID), testCallback(destinationID), testC2ProfileName, true)
}

func assertBFSPath(t *testing.T, path []cbGraphAdjMatrixEntry, expectedEdges [][2]int) {
	t.Helper()
	if len(path) != len(expectedEdges) {
		t.Fatalf("expected path length %d, got %d: %#v", len(expectedEdges), len(path), path)
	}
	for i, expectedEdge := range expectedEdges {
		if path[i].SourceId != expectedEdge[0] || path[i].DestinationId != expectedEdge[1] {
			t.Fatalf("expected path[%d] to be %d -> %d, got %d -> %d",
				i, expectedEdge[0], expectedEdge[1], path[i].SourceId, path[i].DestinationId)
		}
	}
}

func TestGetBFSPathReturnsShortestPathInDelegateWrappingOrder(t *testing.T) {
	graph := newTestCallbackGraph(t)
	addTestGraphEdge(graph, 1, 2)
	addTestGraphEdge(graph, 2, 4)
	addTestGraphEdge(graph, 1, 3)
	addTestGraphEdge(graph, 3, 5)
	addTestGraphEdge(graph, 5, 4)

	path := graph.GetBFSPath(1, 4)

	assertBFSPath(t, path, [][2]int{
		{2, 4},
		{1, 2},
	})
}

func TestGetBFSPathInvalidatesCachedNoPathWhenEdgeIsAdded(t *testing.T) {
	graph := newTestCallbackGraph(t)
	addTestGraphEdge(graph, 1, 2)

	path := graph.GetBFSPath(1, 3)
	if len(path) != 0 {
		t.Fatalf("expected no path before adding edge, got %#v", path)
	}
	if cachedPath, cached := BFSCache.GetPath(1, 3, graph.version); !cached || len(cachedPath) != 0 {
		t.Fatalf("expected cached no-path result, cached=%v path=%#v", cached, cachedPath)
	}

	addTestGraphEdge(graph, 2, 3)
	path = graph.GetBFSPath(1, 3)

	assertBFSPath(t, path, [][2]int{
		{2, 3},
		{1, 2},
	})
}

func TestGetBFSPathInvalidatesCachedPathWhenIntermediateEdgeIsRemoved(t *testing.T) {
	graph := newTestCallbackGraph(t)
	addTestGraphEdge(graph, 1, 2)
	addTestGraphEdge(graph, 2, 3)

	path := graph.GetBFSPath(1, 3)
	assertBFSPath(t, path, [][2]int{
		{2, 3},
		{1, 2},
	})
	versionBeforeRemove := graph.version

	graph.Remove(2, 3, testC2ProfileName)
	if graph.version == versionBeforeRemove {
		t.Fatalf("expected graph version to change after removing an edge")
	}
	path = graph.GetBFSPath(1, 3)
	if len(path) != 0 {
		t.Fatalf("expected no path after removing intermediate edge, got %#v", path)
	}
}

func TestGetBFSPathRefreshesCachedLongerPathWhenShorterEdgeIsAdded(t *testing.T) {
	graph := newTestCallbackGraph(t)
	addTestGraphEdge(graph, 1, 2)
	addTestGraphEdge(graph, 2, 4)

	path := graph.GetBFSPath(1, 4)
	assertBFSPath(t, path, [][2]int{
		{2, 4},
		{1, 2},
	})

	addTestGraphEdge(graph, 1, 4)
	path = graph.GetBFSPath(1, 4)

	assertBFSPath(t, path, [][2]int{
		{1, 4},
	})
}

func TestCanHaveDelegatesUsesCurrentGraphState(t *testing.T) {
	graph := newTestCallbackGraph(t)
	if graph.CanHaveDelegates(1) {
		t.Fatalf("expected callback without edges to have no delegates")
	}

	addTestGraphEdge(graph, 1, 2)
	if !graph.CanHaveDelegates(1) {
		t.Fatalf("expected callback with an outbound edge to have delegates")
	}

	graph.Remove(1, 2, testC2ProfileName)
	if graph.CanHaveDelegates(1) {
		t.Fatalf("expected callback with removed edge to have no delegates")
	}
}

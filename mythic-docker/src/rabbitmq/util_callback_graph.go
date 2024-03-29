package rabbitmq

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"sync"
	"time"
)

// abstract out the graph implementation from the rest of Mythic

type cbGraph struct {
	// map callback_id -> array of adjacent callback_ids
	adjMatrix map[int][]cbGraphAdjMatrixEntry
	lock      sync.RWMutex
}
type cbGraphAdjMatrixEntry struct {
	DestinationId      int
	DestinationAgentId string
	SourceAgentId      string
	SourceId           int
	C2ProfileName      string
}

var callbackGraph cbGraph

type cbGraphBFSEntry struct {
	ParentBFS   *cbGraphBFSEntry
	ID          int
	MatrixEntry cbGraphAdjMatrixEntry
}

var c2profileNameToIdMap map[string]int

type idAndOpId struct {
	CallbackID  int
	OperationID int
}

var uuidToIdAndOpId map[string]idAndOpId

type bfsCache struct {
	// source -> destination -> path
	cache map[int]map[int][][]cbGraphAdjMatrixEntry
	lock  sync.RWMutex
}

var BFSCache bfsCache

func (c *bfsCache) GetPath(sourceId int, destinationId int) []cbGraphAdjMatrixEntry {
	c.lock.RLock()
	defer c.lock.RUnlock()
	if _, sourceExists := c.cache[sourceId]; sourceExists {
		if _, destinationExists := c.cache[sourceId][destinationId]; destinationExists {
			if len(c.cache[sourceId][destinationId]) > 0 {
				return c.cache[sourceId][destinationId][0]
			}
			return nil
		} else {
			return nil
		}
	} else {
		return nil
	}
}
func (c *bfsCache) Remove(sourceId int, destinationId int, c2ProfileName string) {
	c.lock.Lock()
	defer c.lock.Unlock()
	if _, sourceExists := c.cache[sourceId]; sourceExists {
		if _, destinationExists := c.cache[sourceId][destinationId]; destinationExists {
			removalIndex := -1
			for index, _ := range c.cache[sourceId][destinationId] {
				if c.cache[sourceId][destinationId][index][0].C2ProfileName == c2ProfileName {
					removalIndex = index
					break
				}
			}
			if removalIndex >= 0 {
				for index, _ := range c.cache[sourceId][destinationId] {
					if index == removalIndex {
						c.cache[sourceId][destinationId][index] = c.cache[sourceId][destinationId][len(c.cache[sourceId][destinationId])-1]
						c.cache[sourceId][destinationId][len(c.cache[sourceId][destinationId])-1] = nil
						c.cache[sourceId][destinationId] = c.cache[sourceId][destinationId][:len(c.cache[sourceId][destinationId])-1]
						break
					}
				}
			}
			if len(c.cache[sourceId][destinationId]) == 0 {
				delete(c.cache[sourceId], destinationId)
			}
			return
		}
	}
}
func (c *bfsCache) Add(sourceId int, destinationId int, bfsPath []cbGraphAdjMatrixEntry) {
	c.lock.Lock()
	defer c.lock.Unlock()
	if _, sourceExists := c.cache[sourceId]; !sourceExists {
		c.cache[sourceId] = make(map[int][][]cbGraphAdjMatrixEntry)
	}
	if _, destinationExists := c.cache[sourceId][destinationId]; !destinationExists {
		c.cache[sourceId][destinationId] = [][]cbGraphAdjMatrixEntry{
			bfsPath,
		}
	} else {
		c.cache[sourceId][destinationId] = append(c.cache[sourceId][destinationId], bfsPath)
	}
}

func (g *cbGraph) Initialize() {
	edges := []databaseStructs.Callbackgraphedge{}
	g.adjMatrix = make(map[int][]cbGraphAdjMatrixEntry, 0)
	c2profileNameToIdMap = make(map[string]int)
	if err := database.DB.Select(&edges, `SELECT 
    	callbackgraphedge.id,
    	s.agent_callback_id "source.agent_callback_id",
    	s.id "source.id",
    	d.agent_callback_id "destination.agent_callback_id",
    	d.id "destination.id",
    	c2profile.name "c2profile.name"
    	FROM callbackgraphedge
    	JOIN c2profile ON callbackgraphedge.c2_profile_id = c2profile.id
    	JOIN callback s on callbackgraphedge.source_id = s.id
    	JOIN callback d on callbackgraphedge.destination_id = d.id
		WHERE end_timestamp IS NULL`); err != nil {
		logging.LogError(err, "Failed to get callbackgraph edges when initializing")
	} else {
		// make our initial adjacency matrix and tree root data
		for _, edge := range edges {
			g.Add(edge.Source, edge.Destination, edge.C2Profile.Name)
			g.Add(edge.Destination, edge.Source, edge.C2Profile.Name)
		}
	}
	BFSCache.cache = make(map[int]map[int][][]cbGraphAdjMatrixEntry)
}
func (g *cbGraph) Add(source databaseStructs.Callback, destination databaseStructs.Callback, c2profileName string) {
	g.lock.Lock()
	defer g.lock.Unlock()
	if _, ok := g.adjMatrix[source.ID]; !ok {
		// add it
		g.adjMatrix[source.ID] = append(g.adjMatrix[source.ID], cbGraphAdjMatrixEntry{
			DestinationId:      destination.ID,
			DestinationAgentId: destination.AgentCallbackID,
			SourceId:           source.ID,
			SourceAgentId:      source.AgentCallbackID,
			C2ProfileName:      c2profileName,
		})

	} else {
		for _, dest := range g.adjMatrix[source.ID] {
			if dest.DestinationId == destination.ID && dest.C2ProfileName == c2profileName {
				//logging.LogDebug("Found existing p2p connection, not adding new one to memory")
				return
			}
		}
		g.adjMatrix[source.ID] = append(g.adjMatrix[source.ID], cbGraphAdjMatrixEntry{
			DestinationId:      destination.ID,
			DestinationAgentId: destination.AgentCallbackID,
			SourceId:           source.ID,
			SourceAgentId:      source.AgentCallbackID,
			C2ProfileName:      c2profileName,
		})
	}
	return
}
func (g *cbGraph) AddByAgentIds(source string, destination string, c2profileName string) {
	sourceCallback := databaseStructs.Callback{}
	destinationCallback := databaseStructs.Callback{}
	if val, ok := uuidToIdAndOpId[source]; ok {
		sourceCallback.ID = val.CallbackID
		sourceCallback.OperationID = val.OperationID
		sourceCallback.AgentCallbackID = source
	} else if err := database.DB.Get(&sourceCallback, `SELECT 
    	id, operation_id, agent_callback_id 
		FROM callback WHERE agent_callback_id=$1`, source); err != nil {
		logging.LogError(err, "Failed to find source callback for implicit P2P link")
		return
	}
	if val, ok := uuidToIdAndOpId[destination]; ok {
		destinationCallback.ID = val.CallbackID
		destinationCallback.OperationID = val.OperationID
		destinationCallback.AgentCallbackID = destination
	} else if err := database.DB.Get(&destinationCallback, `SELECT 
    	id, operation_id, agent_callback_id 
		FROM callback WHERE agent_callback_id=$1`, destination); err != nil {
		logging.LogError(err, "Failed to find destination callback for implicit P2P link", "destination", destination)
		return
	}
	edge := databaseStructs.Callbackgraphedge{}
	edge.SourceID = sourceCallback.ID
	edge.DestinationID = destinationCallback.ID
	edge.OperationID = sourceCallback.OperationID
	edge.C2ProfileID = getC2ProfileIdForName(c2profileName)
	// only add / talk to database if the in-memory piece gets updated
	g.Add(sourceCallback, destinationCallback, c2profileName)
	g.Add(destinationCallback, sourceCallback, c2profileName)
	// can't have a unique constraint with a NULL value, NULL != NULL
	err := database.DB.Get(&edge.ID, `SELECT id FROM callbackgraphedge
		WHERE operation_id=$1 AND source_id=$2 AND destination_id=$3 AND
		c2_profile_id=$4 AND end_timestamp IS NULL`,
		edge.OperationID, edge.SourceID, edge.DestinationID, edge.C2ProfileID)
	if errors.Is(err, sql.ErrNoRows) {
		// this specific combination didn't yield any results, so add it
		_, err := database.DB.NamedExec(`INSERT INTO callbackgraphedge
			(operation_id, source_id, destination_id, c2_profile_id)
			VALUES (:operation_id, :source_id, :destination_id, :c2_profile_id)`, edge)
		if err != nil {
			logging.LogError(err, "Failed to insert new edge for P2P connection")
		} else {
			logging.LogInfo("added new callbackgraph edge when updating graph by agent ids")
		}
	} else if err != nil {
		// ran into an error doing the query
		logging.LogError(err, "Failed to query for existing P2P connection")
	}

}
func (g *cbGraph) RemoveByAgentIds(source string, destination string, c2profileName string) {
	sourceCallback := databaseStructs.Callback{}
	destinationCallback := databaseStructs.Callback{}
	if val, ok := uuidToIdAndOpId[source]; ok {
		sourceCallback.ID = val.CallbackID
		sourceCallback.OperationID = val.OperationID
		sourceCallback.AgentCallbackID = source
	} else if err := database.DB.Get(&sourceCallback, `SELECT 
    	id, operation_id, agent_callback_id 
		FROM callback WHERE agent_callback_id=$1`, source); err != nil {
		logging.LogError(err, "Failed to find source callback for implicit P2P link")
		return
	}
	if val, ok := uuidToIdAndOpId[destination]; ok {
		destinationCallback.ID = val.CallbackID
		destinationCallback.OperationID = val.OperationID
		destinationCallback.AgentCallbackID = destination
	} else if err := database.DB.Get(&destinationCallback, `SELECT 
    	id, operation_id, agent_callback_id 
		FROM callback WHERE agent_callback_id=$1`, destination); err != nil {
		logging.LogError(err, "Failed to find destination callback for implicit P2P link", "destination", destination, "source", source, "c2", c2profileName)
		return
	}
	if err := RemoveEdgeByIds(sourceCallback.ID, destinationCallback.ID, c2profileName); err != nil {
		logging.LogError(err, "Failed to remove edge")
	}

}
func (g *cbGraph) Remove(sourceId int, destinationId int, c2profileName string) {
	g.lock.Lock()
	defer g.lock.Unlock()
	if _, ok := g.adjMatrix[sourceId]; ok {
		foundIndex := -1
		for i, edge := range g.adjMatrix[sourceId] {
			if edge.DestinationId == destinationId && edge.C2ProfileName == c2profileName {
				foundIndex = i
			}
		}
		if foundIndex >= 0 {
			g.adjMatrix[sourceId][foundIndex] = g.adjMatrix[sourceId][len(g.adjMatrix[sourceId])-1]
			g.adjMatrix[sourceId][len(g.adjMatrix[sourceId])-1] = cbGraphAdjMatrixEntry{}
			g.adjMatrix[sourceId] = g.adjMatrix[sourceId][:len(g.adjMatrix[sourceId])-1]
			//g.adjMatrix[sourceId] = append(g.adjMatrix[sourceId][:foundIndex], g.adjMatrix[sourceId][foundIndex:]...)
			BFSCache.Remove(sourceId, destinationId, c2profileName)
		}
	}
}
func (g *cbGraph) CanHaveDelegates(sourceId int) bool {
	if immediateChildren, exists := g.adjMatrix[sourceId]; !exists {
		return false
	} else {
		return len(immediateChildren) > 0
	}
}
func (g *cbGraph) GetBFSPath(sourceId int, destinationId int) []cbGraphAdjMatrixEntry {
	// breadth-first search from g.adjMatrix[sourceId] ->
	var visitedIDs []int
	var finalPath []cbGraphAdjMatrixEntry
	if sourceId == destinationId {
		return nil
	}
	if existingBFSpath := BFSCache.GetPath(sourceId, destinationId); existingBFSpath != nil {
		logging.LogDebug("returning a cachedBFS path", "sourceID", sourceId, "destinationID", destinationId)
		return existingBFSpath
	}
	// start with a fake-ish entry that we won't include in the final path
	options := []cbGraphBFSEntry{{ID: sourceId, ParentBFS: nil}}
	g.lock.RLock()
	defer g.lock.RUnlock()
	for index := 0; index < len(options); index++ {
		visitedIDs = append(visitedIDs, options[index].ID)
		if options[index].ID == destinationId {
			// we found our entry, now follow the path back up for the shortest path
			parent := options[index].ParentBFS
			finalPath = append(finalPath, options[index].MatrixEntry)
			// our fake initial entry has a ParentBFS of nil, so make sure we're not looking at our fake entry
			for parent != nil && parent.ParentBFS != nil {
				finalPath = append(finalPath, parent.MatrixEntry)
				parent = parent.ParentBFS
			}
			BFSCache.Add(sourceId, destinationId, finalPath)
			return finalPath
		}
		// look through cbGraph.adjMatrix[options[index].ID] to see if we have our destination
		// if we don't have our destination, add it to the list of next places to check
		if nextChildren, ok := g.adjMatrix[options[index].ID]; !ok {
			// options[index].ID isn't in the graph, so just continue
			continue
		} else {
			for _, nextChild := range nextChildren {
				if !utils.SliceContains(visitedIDs, nextChild.DestinationId) {
					options = append(options, cbGraphBFSEntry{
						ID:          nextChild.DestinationId,
						ParentBFS:   &options[index],
						MatrixEntry: nextChild,
					})
				}
			}
		}
	}
	return nil
}
func (g *cbGraph) Print() {
	g.lock.RLock()
	defer g.lock.RUnlock()
	for key, val := range g.adjMatrix {
		for _, entry := range val {
			fmt.Printf("%d --%s--> %d\n", key, entry.C2ProfileName, entry.DestinationId)
		}
	}
}

func RemoveEdgeByIds(sourceId int, destinationId int, c2profileName string) error {
	currentEdges := []databaseStructs.Callbackgraphedge{}
	if err := database.DB.Select(&currentEdges, `SELECT
		id FROM callbackgraphedge WHERE 
		end_timestamp IS NULL AND source_id=$1 AND destination_id=$2 AND c2_profile_id=$3`,
		sourceId, destinationId, getC2ProfileIdForName(c2profileName)); err != nil {
		logging.LogError(err, "Failed to get current edges for callback to update")
		return err
	}
	for _, edge := range currentEdges {
		if _, err := database.DB.Exec(`UPDATE callbackgraphedge SET end_timestamp=$1 WHERE id=$2`,
			time.Now().UTC(), edge.ID); err != nil {
			logging.LogError(err, "Failed to update end_timestamp for edge")
			return err
		} else {
			callbackGraph.Remove(sourceId, destinationId, c2profileName)
			callbackGraph.Remove(destinationId, sourceId, c2profileName)
		}
	}
	return nil
}
func AddEdgeById(sourceId int, destinationId int, c2profileName string) error {
	sourceCallback := databaseStructs.Callback{}
	destinationCallback := databaseStructs.Callback{}
	edge := databaseStructs.Callbackgraphedge{}
	if err := database.DB.Get(&sourceCallback, `SELECT 
    	id, operation_id, agent_callback_id 
		FROM callback WHERE id=$1`, sourceId); err != nil {
		logging.LogError(err, "Failed to find source callback for implicit P2P link")
		return err
	} else if err := database.DB.Get(&destinationCallback, `SELECT 
    	id, operation_id, agent_callback_id 
		FROM callback WHERE id=$1`, destinationId); err != nil {
		logging.LogError(err, "Failed to find destination callback for implicit P2P link")
		return err
	} else {
		edge.SourceID = sourceCallback.ID
		edge.DestinationID = destinationCallback.ID
		edge.OperationID = sourceCallback.OperationID
		edge.C2ProfileID = getC2ProfileIdForName(c2profileName)
		if _, err := database.DB.NamedExec(`INSERT INTO callbackgraphedge 
		(operation_id, source_id, destination_id, c2_profile_id)
		VALUES (:operation_id, :source_id, :destination_id, :c2_profile_id)
		ON CONFLICT DO NOTHING`, edge); err != nil {
			logging.LogError(err, "Failed to insert new edge for P2P connection")
			return err
		} else {
			logging.LogInfo("added new callbackgraph edge in addEdgeById", "c2", c2profileName, "callback", sourceId)
			callbackGraph.Add(sourceCallback, destinationCallback, c2profileName)
		}
	}
	return nil
}
func getC2ProfileIdForName(c2profileName string) int {
	if id, ok := c2profileNameToIdMap[c2profileName]; ok {
		return id
	} else {
		c2profile := databaseStructs.C2profile{}
		if err := database.DB.Get(&c2profile, `SELECT id FROM c2profile WHERE "name"=$1 AND deleted=false`, c2profileName); err != nil {
			logging.LogError(err, "Failed to find c2 profile", "c2profile", c2profileName)
			return 0
		} else {
			c2profileNameToIdMap[c2profileName] = c2profile.ID
			return c2profile.ID
		}
	}
}
func AddEdgeByDisplayIds(sourceId int, destinationId int, c2profileName string, operatorOperation *databaseStructs.Operatoroperation) error {
	source := databaseStructs.Callback{}
	destination := databaseStructs.Callback{}
	if err := database.DB.Get(&source, `SELECT id FROM callback WHERE display_id=$1 AND operation_id=$2`, sourceId, operatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to find source callback when trying to add edge")
		return err
	} else if err := database.DB.Get(&destination, `SELECT id FROM callback WHERE display_id=$1 AND operation_id=$2`, destinationId, operatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to find destination callback when trying to add edge")
		return err
	} else {
		return AddEdgeById(source.ID, destination.ID, c2profileName)
	}
}
func RemoveEdgeById(edgeId int, operatorOperation *databaseStructs.Operatoroperation) error {
	callbackEdge := databaseStructs.Callbackgraphedge{}
	if err := database.DB.Get(&callbackEdge, `SELECT 
    	callbackgraphedge.source_id, 
    	callbackgraphedge.destination_id, 
       c2p.name "c2profile.name"
       FROM callbackgraphedge
       JOIN c2profile c2p on callbackgraphedge.c2_profile_id = c2p.id
       WHERE callbackgraphedge.id=$1 AND callbackgraphedge.operation_id=$2`, edgeId, operatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to find edge information")
		return err
	} else {
		return RemoveEdgeByIds(callbackEdge.SourceID, callbackEdge.DestinationID, callbackEdge.C2Profile.Name)
	}
}

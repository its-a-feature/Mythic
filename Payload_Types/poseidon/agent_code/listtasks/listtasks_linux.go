// +build linux

package listtasks

import (
	"errors"
)

type ListtasksLinux struct {
	Results map[string]interface{}
}

func (l *ListtasksLinux) Result() map[string]interface{} {
	return l.Results
}

func getAvailableTasks() (ListtasksLinux, error) {
	n := ListtasksLinux{}
	m := map[string]interface{}{
		"result": "not implemented",
	}

	n.Results = m
	return n, errors.New("Not implemented")
}

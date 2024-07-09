package databaseStructs

import (
	"database/sql/driver"
	"encoding/json"
	"errors"

	"github.com/its-a-feature/Mythic/logging"
)

// largely pulled from https://github.com/jmoiron/sqlx/blob/master/types/types.go with a few tweaks
// JSONText is a json.RawMessage, which is a []byte underneath.
// Value() validates the json format in the source, and returns an error if
// the json is not valid.  Scan does no validation.  JSONText additionally
// implements `Unmarshal`, which unmarshals the json within to an interface{}
type MythicJSONText json.RawMessage
type MythicJSONArray json.RawMessage

var emptyJSON = MythicJSONText("{}")
var emptyJSONArray = MythicJSONArray("[]")

// MarshalJSON returns the *j as the JSON encoding of j.
func (j MythicJSONText) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return emptyJSON, nil
	}
	return j, nil
}
func (j MythicJSONArray) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return emptyJSONArray, nil
	}
	return j, nil
}

// UnmarshalJSON sets *j to a copy of data
func (j *MythicJSONText) UnmarshalJSON(data []byte) error {
	if j == nil {
		return errors.New("MythicJSONText: UnmarshalJSON on nil pointer")
	}
	*j = append((*j)[0:0], data...)
	return nil
}
func (j *MythicJSONArray) UnmarshalJSON(data []byte) error {
	if j == nil {
		return errors.New("MythicJSONArray: UnmarshalJSON on nil pointer")
	}
	*j = append((*j)[0:0], data...)
	return nil
}

// Value returns j as a value.  This does a validating unmarshal into another
// RawMessage.  If j is invalid json, it returns an error.
func (j MythicJSONText) Value() (driver.Value, error) {
	var m json.RawMessage
	var err = j.Unmarshal(&m)
	if err != nil {
		logging.LogError(err, "Failed to convert MythicJSONText raw value into json Raw Message")
		return []byte{}, err
	}
	return []byte(j), nil
}
func (j MythicJSONArray) Value() (driver.Value, error) {
	// when it comes to storying arrays in postgres, they're stored represented differently
	var m json.RawMessage
	var err = j.Unmarshal(&m)
	if err != nil {
		logging.LogError(err, "Failed to convert MythicJSONArray raw value into json Raw Message")
		return []byte{}, err
	}
	if len(j) < 5 {
		// a single value array should be ["a"] (5 characters min), anything less isn't valid so return '[]'
		return []byte("[]"), nil
	}
	return []byte(j), nil
}
func (j MythicJSONText) StructValue() map[string]interface{} {
	newMap := make(map[string]interface{})
	if err := j.Unmarshal(&newMap); err != nil {
		logging.LogError(err, "Failed to unmarshal types.JSONText into map[string]interface{}")
		return newMap
	}
	if newMap == nil {
		newMap = make(map[string]interface{})
	}
	return newMap
}
func (j MythicJSONArray) StructValue() []interface{} {
	newArray := []interface{}{}
	if err := j.Unmarshal(&newArray); err != nil {
		logging.LogError(err, "Failed to unmarshal types.JSONText into map[string]interface{}")
		return newArray
	}
	return newArray
}
func (j MythicJSONArray) StructStringValue() []string {
	newArray := []interface{}{}
	if err := j.Unmarshal(&newArray); err != nil {
		logging.LogError(err, "Failed to unmarshal types.JSONText into []interface{}{}")
		return nil
	}
	stringArray := make([]string, len(newArray))
	for i, o := range newArray {
		stringArray[i] = o.(string)
	}
	return stringArray
}

// Scan stores the src in *j.  No validation is done.
func (j *MythicJSONText) Scan(src interface{}) error {
	var source []byte
	var err error
	switch t := src.(type) {
	case string:
		source = []byte(t)
	case []byte:
		if len(t) == 0 {
			source = emptyJSON
		} else {
			source = t
		}
	case nil:
		source = emptyJSON
	default:
		if source, err = json.Marshal(src); err != nil {
			logging.LogError(err, "Failed to marshal interface{} into JSON for ScanJSON")
			return err
		}
	}
	*j = append((*j)[0:0], source...)
	return nil
}
func (j *MythicJSONArray) Scan(src interface{}) error {
	var source []byte
	var err error
	switch t := src.(type) {
	case string:
		if len(t) == 0 {
			source = emptyJSONArray
		} else {
			source = []byte(t)
		}

	case []byte:
		if len(t) == 0 {
			source = emptyJSONArray
		} else {
			source = t
		}
	case nil:
		source = emptyJSONArray
	default:
		if source, err = json.Marshal(src); err != nil {
			logging.LogError(err, "Failed to marshal interface{} into JSON for MythicJSONArray Scan")
			return err
		}
	}
	*j = append((*j)[0:0], source...)
	return nil
}

// Unmarshal unmarshal's the json in j to v, as in json.Unmarshal.
func (j *MythicJSONText) Unmarshal(v interface{}) error {
	if len(*j) == 0 {
		*j = emptyJSON
	}
	return json.Unmarshal([]byte(*j), v)
}
func (j *MythicJSONArray) Unmarshal(v interface{}) error {
	if len(*j) == 0 {
		*j = emptyJSONArray
	}
	return json.Unmarshal([]byte(*j), v)
}

// String supports pretty printing for JSONText types.
func (j MythicJSONText) String() string {
	return string(j)
}
func (j MythicJSONArray) String() string {
	return string(j)
}

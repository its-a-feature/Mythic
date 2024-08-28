package utils

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
)

func RemoveStringFromSliceNoOrder(source []string, str string) []string {
	for index, value := range source {
		if str == value {
			source[index] = source[len(source)-1]
			source[len(source)-1] = ""
			source = source[:len(source)-1]
			return source
		}
	}
	// we didn't find the element to remove
	return source
}

func SliceContains[V string | int](source []V, check V) bool {
	for _, v := range source {
		if check == v {
			return true
		}
	}
	return false
}

type AnalyzedPath struct {
	PathPieces    []string `json:"path_pieces"`
	PathSeparator string   `json:"path_separator"`
	Host          string   `json:"host"`
}

func SplitFilePathGetHost(parentPath string, currentPath string, additionalPaths []string) (AnalyzedPath, error) {
	returnedPathInfo := AnalyzedPath{
		PathPieces: additionalPaths[:],
	}
	if strings.HasPrefix(parentPath, "\\") {
		// this means we're looking at a UNC path (windows) despite the / indicators
		stringSplit := strings.Split(parentPath, "\\")
		returnedPathInfo.PathSeparator = "\\"
		if len(stringSplit) > 2 {
			// looking at \\something\\ or \\\\something at least
			if stringSplit[0] == "" && stringSplit[1] == "" {
				// looking at \\\\something
				returnedPathInfo.Host = strings.ToUpper(stringSplit[2])
				returnedPathInfo.PathPieces = append(stringSplit[3:], returnedPathInfo.PathPieces...)

			} else {
				// just \\something\\ which isn't a valid absolute path
				err := errors.New(fmt.Sprintf("bad windows unc path: %s", parentPath))
				return returnedPathInfo, err
			}
		} else {
			// looking at \\something which isn't a valid absolute path
			err := errors.New(fmt.Sprintf("bad windows unc path: %s", parentPath))
			return returnedPathInfo, err
		}
	} else if strings.HasPrefix(parentPath, "//") {
		// looking at a UNC linux path
		stringSplit := strings.Split(parentPath, "/")
		returnedPathInfo.PathSeparator = "/"
		// stringSplit[0] and stringSplit[1] will both be "" since the prefix is //
		returnedPathInfo.Host = strings.ToUpper(stringSplit[2])
		returnedPathInfo.PathPieces = append(stringSplit[3:], returnedPathInfo.PathPieces...)
	} else if strings.HasPrefix(parentPath, "/") {
		// looking at a linux path
		returnedPathInfo.PathSeparator = "/"
		stringSplit := strings.Split(parentPath, "/")
		stringSplit[0] = "/"
		returnedPathInfo.PathPieces = append(stringSplit[:], returnedPathInfo.PathPieces...)
	} else if strings.Contains(parentPath, ":") || strings.Contains(parentPath, "$") {
		// looking at a windows path
		returnedPathInfo.PathSeparator = "\\"
		stringSplit := strings.Split(parentPath, "\\")
		returnedPathInfo.PathPieces = append(stringSplit[:], returnedPathInfo.PathPieces...)
	} else if parentPath == "" {
		// parent path is empty, so likely looking at a root of a tree for a particular host
		// means we can't learn anything about the path from the parent though, so need the current path to try to decide
		if strings.Contains(currentPath, ":") || strings.Contains(currentPath, "$") {
			returnedPathInfo.PathSeparator = "\\"
		} else if strings.Contains(currentPath, "/") {
			returnedPathInfo.PathSeparator = "/"
		} else {
			// unable to determine, so assuming parent path is windows
			returnedPathInfo.PathSeparator = "\\"
		}
	} else {
		// treat this as if this is a windows path with this being the name of an unknown share
		returnedPathInfo.PathSeparator = "\\"
		stringSplit := strings.Split(parentPath, "\\")
		returnedPathInfo.PathPieces = append(stringSplit[:], returnedPathInfo.PathPieces...)
	}
	// remove potential blank spots from pathPieces
	if SliceContains(returnedPathInfo.PathPieces, "") {
		newPathPieces := []string{}
		for _, v := range returnedPathInfo.PathPieces {
			if v == "" {
				continue
			} else {
				newPathPieces = append(newPathPieces, v)
			}
		}
		returnedPathInfo.PathPieces = newPathPieces
	}
	return returnedPathInfo, nil
}

func GenerateRandomPassword(pwLength int) string {
	chars := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*().,<>?/|")
	var b strings.Builder
	for i := 0; i < pwLength; i++ {
		nBig, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			log.Fatalf("[-] Failed to generate random number for password generation\n")
		}
		b.WriteRune(chars[nBig.Int64()])
	}
	return b.String()
}
func GenerateRandomAlphaNumericString(pwLength int) string {
	chars := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
	var b strings.Builder
	for i := 0; i < pwLength; i++ {
		nBig, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			log.Fatalf("[-] Failed to generate random number for password generation\n")
		}
		b.WriteRune(chars[nBig.Int64()])
	}
	return b.String()
}

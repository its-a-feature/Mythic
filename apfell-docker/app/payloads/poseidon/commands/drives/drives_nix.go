// +build linux darwin

package drives

import (
	"io/ioutil"
	"os"
	"path"
	"syscall"

	"pkg/utils/functions"
)

func getDrive(path string) Drive {
	var stat syscall.Statfs_t
	syscall.Statfs(path, &stat)
	// Available blocks * size per block = available space in bytes
	// fmt.Println(stat.Bavail * uint64(stat.Bsize))
	freeBytes := stat.Bavail * uint64(stat.Bsize)
	totalBytes := stat.Blocks * uint64(stat.Bsize)
	freeBytesPretty := functions.UINT64ByteCountDecimal(freeBytes)
	totalBytesPretty := functions.UINT64ByteCountDecimal(totalBytes)
	return Drive{
		Name:             path,
		Description:      "",
		FreeBytes:        stat.Bavail * uint64(stat.Bsize),
		TotalBytes:       stat.Blocks * uint64(stat.Bsize),
		FreeBytesPretty:  freeBytesPretty,
		TotalBytesPretty: totalBytesPretty,
	}
}

func listDrives() ([]Drive, error) {
	var drives []Drive
	drives = append(drives, getDrive("/"))

	_, err := os.Stat("/mnt/")
	if err == nil {
		files, err := ioutil.ReadDir("/mnt/")
		if err == nil {
			for _, f := range files {
				fp := path.Join("/mnt/", f.Name())
				drives = append(drives, getDrive(fp))
			}
		}
	}

	_, err = os.Stat("/Volumes/")
	if err == nil {
		files, err := ioutil.ReadDir("/Volumes/")
		if err == nil {
			for _, f := range files {
				fp := path.Join("/Volumes/", f.Name())
				drives = append(drives, getDrive(fp))
			}
		}
	}
	return drives, nil
}

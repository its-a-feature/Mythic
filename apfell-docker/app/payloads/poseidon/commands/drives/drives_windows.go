//+build windows

package drives

import (
	"strings"

	"pkg/utils/winapi"
)

func listDrives() ([]Drive, error) {
	var results []Drive
	res, err := winapi.GetLogicalDriveStrings()
	if err != nil {
		return results, err
	}
	for _, x := range res {
		desc, err := winapi.GetVolumeInformation(x)
		if err != nil {
			return results, err
		}

		_, totalNumberOfBytes, totalNumberOfFreeBytes, err := winapi.GetDiskFreeSpaceEx(x)
		if err != nil {
			return results, err
		}
		d := Drive{
			Name:             x,
			Description:      strings.Join(desc, " "),
			FreeBytes:        totalNumberOfFreeBytes,
			TotalBytes:       totalNumberOfBytes,
			FreeBytesPretty:  winapi.UINT64ByteCountDecimal(totalNumberOfFreeBytes),
			TotalBytesPretty: winapi.UINT64ByteCountDecimal(totalNumberOfBytes),
		}
		results = append(results, d)
	}

	return results, nil
}

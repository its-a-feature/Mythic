// +build darwin

package screencapture

/*
#cgo LDFLAGS: -framework CoreGraphics -framework CoreFoundation
#include <CoreGraphics/CoreGraphics.h>
void* CompatCGDisplayCreateImageForRect(CGDirectDisplayID display, CGRect rect) {
	return CGDisplayCreateImageForRect(display, rect);
}
void CompatCGImageRelease(void* image) {
	CGImageRelease(image);
}
void* CompatCGImageCreateCopyWithColorSpace(void* image, CGColorSpaceRef space) {
	return CGImageCreateCopyWithColorSpace((CGImageRef)image, space);
}
void CompatCGContextDrawImage(CGContextRef c, CGRect rect, void* image) {
	CGContextDrawImage(c, rect, (CGImageRef)image);
}
*/
import "C"
import (
	"bytes"
	"errors"
	"image"
	"image/png"
	"unsafe"
)

//DarwinScreenshot - struct for screenshot data
type DarwinScreenshot struct {
	MonitorIndex   int
	ScreenshotData []byte
}

//Monitor - Darwin subclass method to return the monitor index
func (d *DarwinScreenshot) Monitor() int {
	return d.MonitorIndex
}

//Data - Darwin subclass method to return the raw png data
func (d *DarwinScreenshot) Data() []byte {
	return d.ScreenshotData
}

func getscreenshot() ([]ScreenShot, error) {
	n := NumActiveDisplays()
	screens := make([]ScreenShot, n)
	for i := 0; i < n; i++ {

		bounds := GetDisplayBounds(i)
		img, err := CaptureRect(bounds)
		if err != nil {
			return nil, err
		}

		buf := new(bytes.Buffer)
		err = png.Encode(buf, img)

		if err != nil {
			return nil, err
		}

		screens[i] = &DarwinScreenshot{
			MonitorIndex:   i,
			ScreenshotData: buf.Bytes(),
		}
	}

	return screens, nil
}

//CreateImage Create an RGBA Image structure in memory
func CreateImage(rect image.Rectangle) (img *image.RGBA, e error) {
	img = nil
	e = errors.New("Cannot create image.RGBA")

	defer func() {
		err := recover()
		if err == nil {
			e = nil
		}
	}()
	// image.NewRGBA may panic if rect is too large.
	img = image.NewRGBA(rect)

	return img, e
}

//Capture a screenshot
func Capture(x, y, width, height int) (*image.RGBA, error) {
	if width <= 0 || height <= 0 {
		return nil, errors.New("width or height should be > 0")
	}

	rect := image.Rect(0, 0, width, height)
	img, err := CreateImage(rect)
	if err != nil {
		return nil, err
	}

	// cg: CoreGraphics coordinate (origin: lower-left corner of primary display, x-axis: rightward, y-axis: upward)
	// win: Windows coordinate (origin: upper-left corner of primary display, x-axis: rightward, y-axis: downward)
	// di: Display local coordinate (origin: upper-left corner of the display, x-axis: rightward, y-axis: downward)

	cgMainDisplayBounds := getCoreGraphicsCoordinateOfDisplay(C.CGMainDisplayID())

	winBottomLeft := C.CGPointMake(C.CGFloat(x), C.CGFloat(y+height))
	cgBottomLeft := getCoreGraphicsCoordinateFromWindowsCoordinate(winBottomLeft, cgMainDisplayBounds)
	cgCaptureBounds := C.CGRectMake(cgBottomLeft.x, cgBottomLeft.y, C.CGFloat(width), C.CGFloat(height))

	ids := activeDisplayList()

	ctx := createBitmapContext(width, height, (*C.uint32_t)(unsafe.Pointer(&img.Pix[0])), img.Stride)
	if ctx == 0 {
		return nil, errors.New("cannot create bitmap context")
	}

	colorSpace := createColorspace()
	if colorSpace == 0 {
		return nil, errors.New("cannot create colorspace")
	}
	defer C.CGColorSpaceRelease(colorSpace)

	for _, id := range ids {
		cgBounds := getCoreGraphicsCoordinateOfDisplay(id)
		cgIntersect := C.CGRectIntersection(cgBounds, cgCaptureBounds)
		if C.CGRectIsNull(cgIntersect) {
			continue
		}
		if cgIntersect.size.width <= 0 || cgIntersect.size.height <= 0 {
			continue
		}

		// CGDisplayCreateImageForRect potentially fail in case width/height is odd number.
		if int(cgIntersect.size.width)%2 != 0 {
			cgIntersect.size.width = C.CGFloat(int(cgIntersect.size.width) + 1)
		}
		if int(cgIntersect.size.height)%2 != 0 {
			cgIntersect.size.height = C.CGFloat(int(cgIntersect.size.height) + 1)
		}

		diIntersectDisplayLocal := C.CGRectMake(cgIntersect.origin.x-cgBounds.origin.x,
			cgBounds.origin.y+cgBounds.size.height-(cgIntersect.origin.y+cgIntersect.size.height),
			cgIntersect.size.width, cgIntersect.size.height)
		captured := C.CompatCGDisplayCreateImageForRect(id, diIntersectDisplayLocal)
		if captured == nil {
			return nil, errors.New("cannot capture display")
		}
		defer C.CompatCGImageRelease(captured)

		image := C.CompatCGImageCreateCopyWithColorSpace(captured, colorSpace)
		if image == nil {
			return nil, errors.New("failed copying captured image")
		}
		defer C.CompatCGImageRelease(image)

		cgDrawRect := C.CGRectMake(cgIntersect.origin.x-cgCaptureBounds.origin.x, cgIntersect.origin.y-cgCaptureBounds.origin.y,
			cgIntersect.size.width, cgIntersect.size.height)
		C.CompatCGContextDrawImage(ctx, cgDrawRect, image)
	}

	i := 0
	for iy := 0; iy < height; iy++ {
		j := i
		for ix := 0; ix < width; ix++ {
			// ARGB => RGBA, and set A to 255
			img.Pix[j], img.Pix[j+1], img.Pix[j+2], img.Pix[j+3] = img.Pix[j+1], img.Pix[j+2], img.Pix[j+3], 255
			j += 4
		}
		i += img.Stride
	}

	return img, nil
}

//NumActiveDisplays get the number of active displays
func NumActiveDisplays() int {
	var count C.uint32_t = 0
	if C.CGGetActiveDisplayList(0, nil, &count) == C.kCGErrorSuccess {
		return int(count)
	} else {
		return 0
	}
}

//GetDisplayBounds Get the display bounds
func GetDisplayBounds(displayIndex int) image.Rectangle {
	id := getDisplayID(displayIndex)
	main := C.CGMainDisplayID()

	var rect image.Rectangle

	bounds := getCoreGraphicsCoordinateOfDisplay(id)
	rect.Min.X = int(bounds.origin.x)
	if main == id {
		rect.Min.Y = 0
	} else {
		mainBounds := getCoreGraphicsCoordinateOfDisplay(main)
		mainHeight := mainBounds.size.height
		rect.Min.Y = int(mainHeight - (bounds.origin.y + bounds.size.height))
	}
	rect.Max.X = rect.Min.X + int(bounds.size.width)
	rect.Max.Y = rect.Min.Y + int(bounds.size.height)

	return rect
}

//getDisplayId Get the display ID
func getDisplayID(displayIndex int) C.CGDirectDisplayID {
	main := C.CGMainDisplayID()
	if displayIndex == 0 {
		return main
	} else {
		n := NumActiveDisplays()
		ids := make([]C.CGDirectDisplayID, n)
		if C.CGGetActiveDisplayList(C.uint32_t(n), (*C.CGDirectDisplayID)(unsafe.Pointer(&ids[0])), nil) != C.kCGErrorSuccess {
			return 0
		}
		index := 0
		for i := 0; i < n; i++ {
			if ids[i] == main {
				continue
			}
			index++
			if index == displayIndex {
				return ids[i]
			}
		}
	}

	return 0
}

func getCoreGraphicsCoordinateOfDisplay(id C.CGDirectDisplayID) C.CGRect {
	main := C.CGDisplayBounds(C.CGMainDisplayID())
	r := C.CGDisplayBounds(id)
	return C.CGRectMake(r.origin.x, -r.origin.y-r.size.height+main.size.height,
		r.size.width, r.size.height)
}

func getCoreGraphicsCoordinateFromWindowsCoordinate(p C.CGPoint, mainDisplayBounds C.CGRect) C.CGPoint {
	return C.CGPointMake(p.x, mainDisplayBounds.size.height-p.y)
}

func createBitmapContext(width int, height int, data *C.uint32_t, bytesPerRow int) C.CGContextRef {
	colorSpace := createColorspace()
	if colorSpace == 0 {
		return 0
	}
	defer C.CGColorSpaceRelease(colorSpace)

	return C.CGBitmapContextCreate(unsafe.Pointer(data),
		C.size_t(width),
		C.size_t(height),
		8, // bits per component
		C.size_t(bytesPerRow),
		colorSpace,
		C.kCGImageAlphaNoneSkipFirst)
}

func createColorspace() C.CGColorSpaceRef {
	return C.CGColorSpaceCreateWithName(C.kCGColorSpaceSRGB)
}

func activeDisplayList() []C.CGDirectDisplayID {
	count := C.uint32_t(NumActiveDisplays())
	ret := make([]C.CGDirectDisplayID, count)
	if count > 0 && C.CGGetActiveDisplayList(count, (*C.CGDirectDisplayID)(unsafe.Pointer(&ret[0])), nil) == C.kCGErrorSuccess {
		return ret
	} else {
		return make([]C.CGDirectDisplayID, 0)
	}
}

// CaptureRect captures specified region of desktop.
func CaptureRect(rect image.Rectangle) (*image.RGBA, error) {
	return Capture(rect.Min.X, rect.Min.Y, rect.Dx(), rect.Dy())
}

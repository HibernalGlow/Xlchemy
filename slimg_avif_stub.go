//go:build !slimg

package main

// When built without the slimg CGO tag, the DLL-based implementation
// in slimg_dll.go provides convertAVIFWithSlimg and isSlimgAvailable.
package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed all:frontend/dist
var assets embed.FS

// App is the global application instance, set in main().
var App *application.App

func init() {
	// Register conversion events
	application.RegisterEvent[ProgressEvent]("conversion:progress")
	application.RegisterEvent[ExceptionEvent]("conversion:exception")
	application.RegisterEvent[struct{}]("conversion:finished")
	application.RegisterEvent[struct{}]("conversion:canceled")
	application.RegisterEvent[struct{}]("conversion:started")
	application.RegisterEvent[FileDropEvent]("files-dropped")
}

func main() {
	App = application.New(application.Options{
		Name:        "Xlchemy",
		Description: "High-performance image converter",
		Services: []application.Service{
			application.NewService(NewAppService()),
		},
		Assets: application.AssetOptions{
			Handler:    application.AssetFileServerFS(assets),
			Middleware: localPreviewMiddleware,
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	win := App.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Xlchemy",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(20, 20, 20),
		URL:              "/",
		Width:            700,
		Height:           520,
		MinWidth:         700,
		MinHeight:        520,
		EnableFileDrop:   true,
		Frameless:        true,
	})

	win.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		files := event.Context().DroppedFiles()
		if len(files) == 0 {
			return
		}
		App.Event.Emit("files-dropped", FileDropEvent{Files: files})
	})

	if err := App.Run(); err != nil {
		log.Fatal(err)
	}
}

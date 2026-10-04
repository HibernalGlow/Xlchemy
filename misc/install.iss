; Inno Setup 6.2.2 script

#define MyAppName "Xlchemy"
#define MyAppVersion "0.9"
#define MyAppPublisher "Code Poems"
#define MyAppURL "https://codepoems.eu"
#define MyAppExeName "xlchemy.exe"

[Setup]
AppId={{19959888-4928-4F51-9C9F-DE681EC27DAA}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
LicenseFile="..\LICENSE.txt"
PrivilegesRequired=admin
OutputBaseFilename=xl-converter
SetupIconFile="..\misc\images\logo.ico"
Compression=lzma2
;Compression=none
SolidCompression=yes
WizardStyle=modern
DisableReadyPage=yes
DisableDirPage=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Files]
; Keep this file ASCII-only: Inno Setup reads it as ANSI and build.py's replaceLine()
; opens it with the platform default encoding, so non-ASCII bytes here raise
; UnicodeDecodeError on Windows (cp1252) and silently skip the version/output-name rewrite.
; The directory name must match COLLECT(name='xlchemy') in misc/main.spec; with the old
; upstream "xl-converter" here ISCC takes files from a folder that does not exist.
Source: "xlchemy\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs overwritereadonly uninsremovereadonly

[Code]

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
Filename: "https://xl-docs.codepoems.eu/"; Description: "Open the manual"; Flags: shellexec postinstall skipifsilent unchecked runasoriginaluser

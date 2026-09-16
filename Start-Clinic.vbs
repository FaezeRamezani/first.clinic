Set WshShell = CreateObject("WScript.Shell")

projectPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

WshShell.Run "cmd /c cd /d """ & projectPath & """ && npm run dev:backend", 0, False

WScript.Sleep 5000

WshShell.Run "cmd /c cd /d """ & projectPath & """ && npm run dev", 0, False

WScript.Sleep 5000

WshShell.Run "http://localhost:5173", 1, False
# Creates a "Swoopt" shortcut on the current user's Desktop that launches the app.
# Paths are resolved at runtime, so this works on any machine / any folder location.
$launcher = $PSScriptRoot
$root     = Split-Path $launcher -Parent

$ws      = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$sc      = $ws.CreateShortcut((Join-Path $desktop 'Swoopt.lnk'))
$sc.TargetPath       = Join-Path $launcher 'start-swoopt.bat'
$sc.WorkingDirectory = $root
$sc.IconLocation     = (Join-Path $launcher 'swoopt.ico') + ',0'
$sc.Description       = 'Launch Swoopt media downloader'
$sc.WindowStyle      = 7   # start minimized
$sc.Save()

Write-Host "Created 'Swoopt' shortcut on your Desktop." -ForegroundColor Green
Write-Host "Target: $($sc.TargetPath)"

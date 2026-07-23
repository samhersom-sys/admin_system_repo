$f = "C:\Users\samhe\OneDrive\Desktop\Cleaned\backend\nest\src\search\search.service.ts"
$content = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)

Write-Host "File length: $($content.Length)"
Write-Host "defaultMode at: $($content.IndexOf('// Default mode'))"
Write-Host "filterMode at: $($content.IndexOf('// Filter mode'))"
Write-Host "fetchWithAuditOrFallback at: $($content.IndexOf('fetchWithAuditOrFallback'))"

# Find the start of the "Default mode" banner (the dashes before it)
$defaultBannerSearch = "    //" + ("-" * 77)
$pos = $content.IndexOf($defaultBannerSearch)
# Find the next occurrence (the filter mode banner)
$filterBannerSearch = "// Filter mode"
$filterPos = $content.IndexOf($filterBannerSearch)
# Go back to find the full banner line before filterMode
$filterBannerLineStart = $content.LastIndexOf("    // " + ("-" * 75), $filterPos)
Write-Host "defaultBannerPos: $pos"
Write-Host "filterBannerLineStart: $filterBannerLineStart"
Write-Host "filterModeCommentStart: $filterPos"

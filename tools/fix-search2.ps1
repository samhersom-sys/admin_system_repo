$f = "C:\Users\samhe\OneDrive\Desktop\Cleaned\backend\nest\src\search\search.service.ts"
$content = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
$banner = "    // ---------------------------------------------------------------------------"
$defStart = $content.LastIndexOf($banner, $content.IndexOf("// Default mode"))
$filterModePos = $content.IndexOf("// Filter mode")
$filterBannerStart = $content.LastIndexOf($banner, $filterModePos)
Write-Host "defStart=$defStart filterBannerStart=$filterBannerStart"
$newContent = $content.Substring(0, $defStart) + $content.Substring($filterBannerStart)
$newContent = $newContent -replace 'LIMIT 200', 'LIMIT 2000'
[IO.File]::WriteAllText($f, $newContent, [Text.Encoding]::UTF8)
Write-Host "Done. defaultMode:$($newContent.IndexOf('defaultMode')) LIMIT2000:$(([regex]::Matches($newContent,'LIMIT 2000')).Count)"

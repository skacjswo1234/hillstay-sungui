# FFmpeg를 사용한 PNG to WebP 변환 스크립트

Write-Host "이미지 WebP 변환 시작...`n" -ForegroundColor Green

# PC 폴더 변환
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PC 폴더 변환:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$pcFolder = ".\images\pc"
$pcFiles = Get-ChildItem -Path $pcFolder -Filter "*.png"

foreach ($file in $pcFiles) {
    $inputPath = $file.FullName
    $outputPath = Join-Path $pcFolder ($file.BaseName + ".webp")
    
    Write-Host "변환 중: $($file.Name) -> $($file.BaseName).webp" -ForegroundColor Yellow
    
    ffmpeg -i $inputPath -quality 85 -y $outputPath 2>&1 | Out-Null
    
    if (Test-Path $outputPath) {
        $originalSize = (Get-Item $inputPath).Length
        $newSize = (Get-Item $outputPath).Length
        $reduction = [math]::Round((($originalSize - $newSize) / $originalSize) * 100, 1)
        
        Write-Host "  ✓ 완료: $([math]::Round($originalSize/1KB, 1))KB -> $([math]::Round($newSize/1KB, 1))KB ($reduction% 감소)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 실패: $($file.Name)" -ForegroundColor Red
    }
}

Write-Host "`n$($pcFiles.Count)개 파일 변환 완료: $pcFolder`n" -ForegroundColor Green

# MOB 폴더 변환
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "MOB 폴더 변환:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$mobFolder = ".\images\mob"
$mobFiles = Get-ChildItem -Path $mobFolder -Filter "*.png"

foreach ($file in $mobFiles) {
    $inputPath = $file.FullName
    $outputPath = Join-Path $mobFolder ($file.BaseName + ".webp")
    
    Write-Host "변환 중: $($file.Name) -> $($file.BaseName).webp" -ForegroundColor Yellow
    
    ffmpeg -i $inputPath -quality 85 -y $outputPath 2>&1 | Out-Null
    
    if (Test-Path $outputPath) {
        $originalSize = (Get-Item $inputPath).Length
        $newSize = (Get-Item $outputPath).Length
        $reduction = [math]::Round((($originalSize - $newSize) / $originalSize) * 100, 1)
        
        Write-Host "  ✓ 완료: $([math]::Round($originalSize/1KB, 1))KB -> $([math]::Round($newSize/1KB, 1))KB ($reduction% 감소)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 실패: $($file.Name)" -ForegroundColor Red
    }
}

Write-Host "`n$($mobFiles.Count)개 파일 변환 완료: $mobFolder" -ForegroundColor Green
Write-Host "`n모든 변환 완료!`n" -ForegroundColor Green


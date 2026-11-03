Add-Type -AssemblyName System.Drawing

function Crop-Image($sourcePath, $destPath, $x, $y, $width, $height) {
    $src = [System.Drawing.Image]::FromFile($sourcePath)
    $rect = New-Object System.Drawing.Rectangle($x, $y, $width, $height)
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
    Write-Host "Cropped to $destPath ($width x $height)"
}

# 1. Dark logo with signature
Crop-Image "D:\Gazzar Project\public\design-reference\gx-theme\dark_branding_panel.png" "D:\Gazzar Project\public\gx_logo_dark.png" 306 14 196 150

# 2. Light logo with signature
Crop-Image "D:\Gazzar Project\public\design-reference\gx-theme\light_branding_panel.png" "D:\Gazzar Project\public\gx_logo_light.png" 252 16 220 132

# 3. Coach Abdullah portrait (sunglasses & bucket hat)
Crop-Image "D:\Gazzar Project\public\design-reference\gx-theme\light_branding_panel.png" "D:\Gazzar Project\public\coach_abdullah_portrait.png" 0 0 255 327

# 4. Coach Abdullah action lifting
Crop-Image "D:\Gazzar Project\public\design-reference\gx-theme\dark_branding_panel.png" "D:\Gazzar Project\public\coach_abdullah_action.png" 0 0 290 358

# 5. Coach Abdullah hero (full head and athletic torso)
Crop-Image "D:\Gazzar Project\public\design-reference\gx-theme\light_desktop_dashboard.png" "D:\Gazzar Project\public\coach_abdullah_hero.png" 690 36 130 288

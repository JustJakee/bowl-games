# Regenerate public app icons from the supplied square logo without cropping it.
Add-Type -AssemblyName System.Drawing

$publicDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'public'
$brandingDirectory = Join-Path $publicDirectory 'branding'
$sourcePath = Join-Path $brandingDirectory 'bobs-bowl-games-icon.png'
$source = [System.Drawing.Bitmap]::new($sourcePath)

try {
  if ($source.Width -ne $source.Height) {
    throw 'The source logo must be square to avoid stretching or cropping.'
  }

  $outputSizes = @{
    'icon-192.png' = 192
    'icon-512.png' = 512
    'apple-touch-icon-180.png' = 180
    'favicon-32.png' = 32
    'favicon-16.png' = 16
  }

  foreach ($fileName in $outputSizes.Keys) {
    $size = $outputSizes[$fileName]
    $output = [System.Drawing.Bitmap]::new(
      $size,
      $size,
      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($output)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.DrawImage(
        $source,
        [System.Drawing.Rectangle]::new(0, 0, $size, $size),
        [System.Drawing.Rectangle]::new(0, 0, $source.Width, $source.Height),
        [System.Drawing.GraphicsUnit]::Pixel
      )
      $output.Save(
        (Join-Path $brandingDirectory $fileName),
        [System.Drawing.Imaging.ImageFormat]::Png
      )
    } finally {
      $graphics.Dispose()
      $output.Dispose()
    }
  }

  # Modern ICO files can contain PNG-compressed sizes. Include both favicon sizes.
  $iconSizes = @(16, 32)
  $iconImages = [System.Collections.Generic.List[byte[]]]::new()
  foreach ($size in $iconSizes) {
    $iconImages.Add(
      [System.IO.File]::ReadAllBytes((Join-Path $brandingDirectory "favicon-$size.png"))
    )
  }
  $iconPath = Join-Path $brandingDirectory 'favicon.ico'
  $stream = [System.IO.File]::Create($iconPath)
  $writer = [System.IO.BinaryWriter]::new($stream)
  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]$iconSizes.Count)
    $offset = 6 + 16 * $iconSizes.Count
    for ($index = 0; $index -lt $iconSizes.Count; $index++) {
      $writer.Write([byte]$iconSizes[$index])
      $writer.Write([byte]$iconSizes[$index])
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]$iconImages[$index].Length)
      $writer.Write([UInt32]$offset)
      $offset += $iconImages[$index].Length
    }
    foreach ($image in $iconImages) { $writer.Write($image) }
  } finally {
    $writer.Dispose()
  }

  Copy-Item -LiteralPath $iconPath -Destination (Join-Path $publicDirectory 'favicon.ico') -Force
  Write-Output 'Generated 192, 512, 180, 32, and 16 pixel PNGs plus a two-size favicon.ico.'
} finally {
  $source.Dispose()
}

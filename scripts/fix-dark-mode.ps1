# Dark Mode Auto-Fix Script
# This script automatically adds dark mode classes to components

param(
    [Parameter(Mandatory=$false)]
    [string]$Path = "src",
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

Write-Host "Dark Mode Auto-Fix Script" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
    Write-Host ""
}

# Define replacement patterns
$replacements = @(
    # Background colors
    @{
        Pattern = 'className="([^"]*)\bbg-white\b(?!.*dark:bg-)([^"]*)"'
        Replacement = 'className="$1bg-white dark:bg-gray-dark$2"'
        Description = "bg-white → bg-white dark:bg-gray-dark"
    },
    @{
        Pattern = 'className="([^"]*)\bbg-gray-50\b(?!.*dark:bg-)([^"]*)"'
        Replacement = 'className="$1bg-gray-50 dark:bg-gray-800$2"'
        Description = "bg-gray-50 → bg-gray-50 dark:bg-gray-800"
    },
    @{
        Pattern = 'className="([^"]*)\bbg-gray-100\b(?!.*dark:bg-)([^"]*)"'
        Replacement = 'className="$1bg-gray-100 dark:bg-gray-700$2"'
        Description = "bg-gray-100 → bg-gray-100 dark:bg-gray-700"
    },
    
    # Text colors
    @{
        Pattern = 'className="([^"]*)\btext-gray-900\b(?!.*dark:text-)([^"]*)"'
        Replacement = 'className="$1text-gray-900 dark:text-white$2"'
        Description = "text-gray-900 → text-gray-900 dark:text-white"
    },
    @{
        Pattern = 'className="([^"]*)\btext-gray-700\b(?!.*dark:text-)([^"]*)"'
        Replacement = 'className="$1text-gray-700 dark:text-gray-300$2"'
        Description = "text-gray-700 → text-gray-700 dark:text-gray-300"
    },
    @{
        Pattern = 'className="([^"]*)\btext-gray-600\b(?!.*dark:text-)([^"]*)"'
        Replacement = 'className="$1text-gray-600 dark:text-gray-400$2"'
        Description = "text-gray-600 → text-gray-600 dark:text-gray-400"
    },
    @{
        Pattern = 'className="([^"]*)\btext-gray-500\b(?!.*dark:text-)([^"]*)"'
        Replacement = 'className="$1text-gray-500 dark:text-gray-400$2"'
        Description = "text-gray-500 → text-gray-500 dark:text-gray-400"
    },
    
    # Border colors
    @{
        Pattern = 'className="([^"]*)\bborder-gray-200\b(?!.*dark:border-)([^"]*)"'
        Replacement = 'className="$1border-gray-200 dark:border-gray-700$2"'
        Description = "border-gray-200 → border-gray-200 dark:border-gray-700"
    },
    @{
        Pattern = 'className="([^"]*)\bborder-gray-300\b(?!.*dark:border-)([^"]*)"'
        Replacement = 'className="$1border-gray-300 dark:border-gray-600$2"'
        Description = "border-gray-300 → border-gray-300 dark:border-gray-600"
    }
)

# Get all TSX files
$files = Get-ChildItem -Path $Path -Filter "*.tsx" -Recurse -File

Write-Host "Found $($files.Count) TSX files to process" -ForegroundColor Green
Write-Host ""

$totalChanges = 0
$filesModified = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    $fileChanges = 0
    
    foreach ($replacement in $replacements) {
        $matches = [regex]::Matches($content, $replacement.Pattern)
        if ($matches.Count -gt 0) {
            $content = $content -replace $replacement.Pattern, $replacement.Replacement
            $fileChanges += $matches.Count
        }
    }
    
    if ($fileChanges -gt 0) {
        $filesModified++
        $totalChanges += $fileChanges
        
        $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart("\")
        Write-Host "Modified: $relativePath" -ForegroundColor Yellow
        Write-Host "  Changes: $fileChanges" -ForegroundColor Gray
        
        if (-not $DryRun) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
        }
    }
}

Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Files modified: $filesModified" -ForegroundColor White
Write-Host "  Total changes: $totalChanges" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Host "This was a dry run. Run without -DryRun to apply changes." -ForegroundColor Yellow
} else {
    Write-Host "All changes have been applied!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please review the changes and test your application." -ForegroundColor Yellow
}

Write-Host ""

Write-Host "=== TESTING TV PLAYER ONLINE (https://tv.oussamma.tn) ==="

$tests = @(
    @{ Name = "Health Check (/health)"; Url = "https://tv.oussamma.tn/health"; ExpectedStatus = 200 },
    @{ Name = "Frontend SPA / PWA (/)"; Url = "https://tv.oussamma.tn/"; ExpectedStatus = 200 },
    @{ Name = "Swagger Documentation (/api/docs)"; Url = "https://tv.oussamma.tn/api/docs"; ExpectedStatus = 200 },
    @{ Name = "Protected Channels API (401 without SSO)"; Url = "https://tv.oussamma.tn/api/v1/channels"; ExpectedStatus = 401 },
    @{ Name = "Protected Categories API (401 without SSO)"; Url = "https://tv.oussamma.tn/api/v1/categories"; ExpectedStatus = 401 },
    @{ Name = "PWA Manifest (/manifest.json)"; Url = "https://tv.oussamma.tn/manifest.json"; ExpectedStatus = 200 },
    @{ Name = "SSO Login Flow (/auth/login -> sso-a)"; Url = "https://tv.oussamma.tn/auth/login"; ExpectedStatus = 302 }
)

foreach ($test in $tests) {
    try {
        $req = [System.Net.HttpWebRequest]::Create($test.Url)
        $req.AllowAutoRedirect = $false
        $req.Timeout = 10000
        $req.UserAgent = "TVPlayer-TestAgent/1.0"
        $resp = [System.Net.HttpWebResponse]$req.GetResponse()
        $code = [int]$resp.StatusCode
        $resp.Close()

        if ($code -eq $test.ExpectedStatus -or ($test.ExpectedStatus -eq 302 -and ($code -eq 302 -or $code -eq 307 -or $code -eq 303))) {
            Write-Host " [PASS] $($test.Name): HTTP $code (Expected $($test.ExpectedStatus))" -ForegroundColor Green
        } else {
            Write-Host " [WARN] $($test.Name): HTTP $code (Expected $($test.ExpectedStatus))" -ForegroundColor Yellow
        }
    } catch [System.Net.WebException] {
        if ($_.Response) {
            $code = [int]$_.Response.StatusCode
            if ($code -eq $test.ExpectedStatus -or ($test.ExpectedStatus -eq 302 -and ($code -eq 302 -or $code -eq 307 -or $code -eq 303))) {
                Write-Host " [PASS] $($test.Name): HTTP $code (Expected $($test.ExpectedStatus))" -ForegroundColor Green
            } else {
                Write-Host " [FAIL] $($test.Name): HTTP $code (Expected $($test.ExpectedStatus))" -ForegroundColor Red
            }
        } else {
            Write-Host " [ERROR] $($test.Name): $($_.Message)" -ForegroundColor Red
        }
    }
}

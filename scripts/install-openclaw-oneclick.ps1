param()

function Write-Log { param($m) Write-Host "[OpenClaw-Installer] $m" }

Write-Log "Starting one-click OpenClaw installer"

# 1) Ensure PowerShell TLS support
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 2) Ensure Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
	Write-Log "Git not found. Please install Git for Windows and re-run this script. Exiting."
	exit 1
}

# 3) Ensure Node (via MSI) is installed; if missing, download latest LTS MSI and install silently
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
	Write-Log "Node not found. Downloading latest LTS Node MSI and installing..."
	try {
		$index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing
		$lts = $index | Where-Object { $_.lts } | Select-Object -First 1
		if (-not $lts) { throw 'Unable to find LTS entry from node index.json' }
		$version = $lts.version # e.g. v20.24.0
		$msiName = "node-$version-x64.msi"
		$url = "https://nodejs.org/dist/$version/$msiName"
		$dest = Join-Path $env:TEMP $msiName
		Write-Log "Downloading $url to $dest"
		Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
		Write-Log "Running msiexec to install Node (may prompt for elevation)"
		$args = "/i `"$dest`" /quiet /norestart"
		$p = Start-Process -FilePath msiexec.exe -ArgumentList $args -Wait -PassThru
		if ($p.ExitCode -ne 0) { Write-Log "msiexec returned exit code $($p.ExitCode)"; exit 1 }
		Write-Log "Node installation finished"
	} catch {
		Write-Log "Node install failed: $_"
		exit 1
	}
}

	# Refresh session PATH to include Node install location so 'node' and 'npm' are available immediately
	function Add-NodeToPathSession {
		# Common install locations
		$possible = @(
			"C:\Program Files\nodejs\node.exe",
			"C:\Program Files (x86)\nodejs\node.exe"
		)
		$nodeExe = $possible | Where-Object { Test-Path $_ } | Select-Object -First 1

		if (-not $nodeExe) {
			# Try to find node in the machine PATH
			$machinePath = [Environment]::GetEnvironmentVariable('Path','Machine')
			if ($machinePath) {
				$entries = $machinePath.Split(';') | Where-Object { $_ -ne '' }
				foreach ($e in $entries) {
					$candidate = Join-Path $e 'node.exe'
					if (Test-Path $candidate) { $nodeExe = $candidate; break }
				}
			}
		}

		if ($nodeExe) {
			$nodeDir = Split-Path $nodeExe -Parent
			if ($env:Path -notlike "*${nodeDir}*") {
				$env:Path = "$nodeDir;$env:Path"
				Write-Log "Added $nodeDir to PATH for this session"
			}
			return $true
		}

		Write-Log "Warning: node.exe not found after install. You may need to open a new shell or log out/in."
		return $false
	}

	Add-NodeToPathSession | Out-Null

	Write-Log "Node version: $(if (Get-Command node -ErrorAction SilentlyContinue) { node --version } else { '' })"
	Write-Log "npm version: $(if (Get-Command npm -ErrorAction SilentlyContinue) { npm --version } else { '' })"

# 4) Choose install directory and clone repo
$defaultDir = Join-Path $env:USERPROFILE 'openclaw'
$installDir = Read-Host "Enter install directory (default: $defaultDir)"; if ([string]::IsNullOrWhiteSpace($installDir)) { $installDir = $defaultDir }

if (Test-Path $installDir) {
	Write-Log "Directory $installDir already exists. Will attempt to pull latest if it's a git repo."
	if (Test-Path (Join-Path $installDir '.git')) {
		Push-Location $installDir
		git pull --rebase
		Pop-Location
	} else {
		Write-Log "$installDir exists and is not a git repo."
		$resp = Read-Host "Overwrite (delete) and clone into $installDir? (Y/N) [N]"
		if ($resp -match '^[Yy]') {
			Write-Log "Removing $installDir"
			try { Remove-Item -Recurse -Force $installDir } catch { Write-Log "Remove failed: $_"; exit 1 }
			Write-Log "Cloning https://github.com/openclaw/openclaw.git into $installDir"
			git clone https://github.com/openclaw/openclaw.git $installDir
		} else {
			$newDir = Read-Host "Enter new install directory (or leave empty to cancel)"
			if ([string]::IsNullOrWhiteSpace($newDir)) { Write-Log "Installation cancelled by user"; exit 1 }
			$installDir = $newDir
			Write-Log "Cloning into $installDir"
			git clone https://github.com/openclaw/openclaw.git $installDir
		}
	}
} else {
	Write-Log "Cloning https://github.com/openclaw/openclaw.git into $installDir"
	git clone https://github.com/openclaw/openclaw.git $installDir
}

# 5) Install CLI globally and run onboard
Write-Log "Installing OpenClaw CLI globally via npm (openclaw@latest)"
try {
	# Prefer invoking npm.cmd if available (avoids %1 not valid Win32 application errors)
	$npmCmd = $null
	if (Get-Command npm -ErrorAction SilentlyContinue) { $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source }
	if (-not $npmCmd -and (Get-Command node -ErrorAction SilentlyContinue)) {
		$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
		$nodeDir = Split-Path $nodePath -Parent
		$candidate = Join-Path $nodeDir 'npm.cmd'
		if (Test-Path $candidate) { $npmCmd = $candidate }
	}

	if ($npmCmd) {
		Write-Log "Running: $npmCmd install -g openclaw@latest"
		& $npmCmd install -g openclaw@latest
		if ($LASTEXITCODE -ne 0) { throw "npm exited with $LASTEXITCODE" }
	} else {
		Write-Log "npm executable not found directly; falling back to 'cmd /c npm'"
		$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','npm install -g openclaw@latest' -Wait -PassThru
		if ($p.ExitCode -ne 0) { throw "cmd npm install failed with exit $($p.ExitCode)" }
	}
} catch {
	Write-Log "Global npm install failed: $_"; exit 1
}

Write-Log "Running 'openclaw onboard --install-daemon' to setup gateway daemon"
try {
	# Ensure npm global prefix/bin is in PATH for this session
	$globalBin = $null
	try {
		# npm v10+ removed 'npm bin -g'; use 'npm config get prefix' to get the global prefix
		$prefix = (& cmd /c npm config get prefix) -replace "\r", ''
		if ($prefix -and -not [string]::IsNullOrWhiteSpace($prefix)) {
			# On Windows, global executables live directly under the prefix (e.g. prefix\openclaw.cmd)
			$globalBin = $prefix.Trim()
		}
	} catch {
		$globalBin = $null
	}
	if ($globalBin) { $globalBin = $globalBin.Trim() }
	Write-Log "DEBUG: npm global bin (raw): '$globalBin'"
	if ($globalBin -and (Test-Path $globalBin)) {
		if ($env:Path -notlike "*${globalBin}*") { $env:Path = "$globalBin;$env:Path"; Write-Log "Added npm global bin $globalBin to PATH" }

		# Print full PATH for debugging
		Write-Log "DEBUG: PATH: $env:Path"

		# Make 'openclaw' available in this PowerShell session immediately by creating an alias/function
		$ocCmd = Join-Path $globalBin 'openclaw.cmd'
		$ocPs1 = Join-Path $globalBin 'openclaw.ps1'
		$ocExe = Join-Path $globalBin 'openclaw'
		Write-Log "DEBUG: openclaw.cmd exists: $(Test-Path $ocCmd)"
		Write-Log "DEBUG: openclaw.ps1 exists: $(Test-Path $ocPs1)"
		Write-Log "DEBUG: openclaw (no ext) exists: $(Test-Path $ocExe)"
		if (Test-Path $ocCmd) {
			try { Set-Alias -Name openclaw -Value $ocCmd -Force; Write-Log "Set alias openclaw -> $ocCmd" } catch {}
		} elseif (Test-Path $ocPs1) {
			try { Remove-Item Function:\openclaw -ErrorAction SilentlyContinue } catch {}
			function openclaw { param($args) & "${ocPs1}" @args }
			Write-Log "Created function openclaw -> $ocPs1"
		} elseif (Test-Path $ocExe) {
			try { Set-Alias -Name openclaw -Value $ocExe -Force; Write-Log "Set alias openclaw -> $ocExe" } catch {}
		}
	}

	# Look for possible openclaw executables
	$candidates = @()
	if ($globalBin) { $candidates += (Join-Path $globalBin 'openclaw.cmd'); $candidates += (Join-Path $globalBin 'openclaw'); $candidates += (Join-Path $globalBin 'openclaw.ps1') }
	$oc = Get-Command openclaw -ErrorAction SilentlyContinue
	if ($oc) { $candidates += $oc.Source }

	Write-Log "DEBUG: candidate paths:" 
	$candidates | ForEach-Object { Write-Log "  $_" }
	$found = $candidates | Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and (Test-Path $_) } | Select-Object -First 1
	Write-Log "DEBUG: selected found value: '$found'"
	if ($found) {
		Write-Log "Found openclaw executable: $found"
		# prepare log path
		$log = Join-Path $env:TEMP 'openclaw_onboard.log'
		if (Test-Path $log) { Remove-Item $log -Force }
		# Run inline in the current shell (no spawn), output goes to the current console
		Write-Log "Running inline: & `"$found`" onboard --install-daemon"
		& "$found" onboard --install-daemon
		$rc = $LASTEXITCODE
		if ($rc -ne 0) { throw "openclaw onboarding failed with exit $rc" }

		# After successful onboarding, run 'openclaw setup' to complete configuration
		Write-Log "Running inline: & `"$found`" setup"
		& "$found" setup
		$rc = $LASTEXITCODE
		if ($rc -ne 0) { throw "openclaw setup failed with exit $rc" }
	} else {
		Write-Log "openclaw executable not found after npm install; candidates were:"
		$candidates | ForEach-Object { Write-Log "  $_" }
		Write-Log "Attempting 'cmd /c openclaw onboard --install-daemon'"
		$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','openclaw onboard --install-daemon' -Wait -PassThru
		if ($p.ExitCode -ne 0) { throw "openclaw onboarding failed with exit $($p.ExitCode)" }
	}
} catch {
	Write-Log "openclaw onboard failed: $_"
	if ($log -and (Test-Path $log)) {
		Write-Log "Onboard log (last 200 lines):"
		Get-Content $log -Tail 200 | ForEach-Object { Write-Log "  $_" }
	}
	Write-Log "Try running the following manually to see detailed output:"
	Write-Log "  cmd /c openclaw onboard --install-daemon"
	exit 1
}

Write-Log "Onboard complete. You can now run 'openclaw gateway --port 18789 --verbose' or use the Start menu/service manager to start the service."
Write-Log "Finished"

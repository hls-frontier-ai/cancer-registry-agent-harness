[CmdletBinding()]
param(
    [string] $SubscriptionId = '3e757a05-45dc-4b40-a599-de516844c441',
    [string] $ResourceGroup = 'rg-cancer-registry-agent-harness',
    [string] $Location = 'eastus2',
    [string] $Prefix = 'registryharness',
    [string] $OpenAIResourceGroup = 'rg-clario-demo',
    [string] $OpenAIAccountName = 'clario-aoai-primary-55x45i3hlmqsc',
    [string] $ModelDeploymentName = 'gpt-5.4',
    [switch] $EnableClarioTestMode
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

az.cmd account set --subscription $SubscriptionId
if ($LASTEXITCODE -ne 0) { throw 'Unable to select the Azure subscription.' }

$revision = (git rev-parse HEAD 2>$null)
if (-not $revision) { $revision = 'uncommitted-local-build' }
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$shortRevision = $revision.Substring(0, [Math]::Min(12, $revision.Length))
$deployedRevision = if (git status --porcelain) { "$revision-dirty-$timestamp" } else { $revision }
$tag = "harness:$shortRevision-$timestamp"
$openAIResourceId = az.cmd cognitiveservices account show --resource-group $OpenAIResourceGroup --name $OpenAIAccountName --query id -o tsv
$openAIEndpoint = az.cmd cognitiveservices account show --resource-group $OpenAIResourceGroup --name $OpenAIAccountName --query properties.endpoint -o tsv
if (-not $openAIResourceId -or -not $openAIEndpoint) { throw 'The existing Clario Azure OpenAI account was not found.' }

npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw 'Tests failed; deployment stopped.' }

az.cmd group create --name $ResourceGroup --location $Location --tags application=cancer-registry-harness dataClassification=synthetic-only environment=demo | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Resource group creation failed.' }

$commonParameters = @(
    "prefix=$Prefix",
    "location=$Location",
    "activeGitSha=$deployedRevision",
    "existingOpenAIResourceId=$openAIResourceId",
    "openAIEndpoint=$openAIEndpoint",
    "modelDeploymentName=$ModelDeploymentName",
    "enableClarioTestMode=$($EnableClarioTestMode.IsPresent.ToString().ToLowerInvariant())"
)

$acrName = az.cmd acr list --resource-group $ResourceGroup --query '[0].name' -o tsv
if (-not $acrName) {
    $bootstrapImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
    az.cmd deployment group create --resource-group $ResourceGroup --name bootstrap --template-file infra/main.bicep --parameters apiImage=$bootstrapImage @commonParameters | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Bootstrap infrastructure deployment failed.' }
    $acrName = az.cmd deployment group show --resource-group $ResourceGroup --name bootstrap --query properties.outputs.acrName.value -o tsv
}

az.cmd acr build --registry $acrName --image $tag --file apps/api/Dockerfile .
if ($LASTEXITCODE -ne 0) { throw 'Container image build failed.' }

$image = "${acrName}.azurecr.io/$tag"
$deployment = az.cmd deployment group create --resource-group $ResourceGroup --template-file infra/main.bicep --parameters apiImage=$image @commonParameters | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Final infrastructure deployment failed.' }

$outputs = $deployment.properties.outputs
Write-Host "Application:  $($outputs.endpointUrl.value)"
Write-Host "Abstraction: $($outputs.abstractionUrl.value)"
Write-Host "Cases:       $($outputs.casesUrl.value)"
Write-Host "Manifest:    $($outputs.manifestUrl.value)"
Write-Host "Health:      $($outputs.healthUrl.value)"
Write-Host "Revision:    $($outputs.deployedRevision.value)"
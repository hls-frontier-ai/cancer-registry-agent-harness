@description('Short lowercase prefix used in globally scoped resource names.')
@minLength(5)
param prefix string = 'registryharness'

param location string = resourceGroup().location
param apiImage string
param activeGitSha string
param existingOpenAIResourceId string
param openAIEndpoint string
param modelDeploymentName string = 'gpt-5.4'
param enableClarioTestMode bool = false

var uniqueSuffix = take(uniqueString(subscription().id, resourceGroup().id, prefix), 10)
var generatedAcrName = take(replace('${prefix}${uniqueSuffix}', '-', ''), 50)
var acrName = length(generatedAcrName) >= 5 ? generatedAcrName : 'crhns${uniqueSuffix}'
var managedEnvironmentName = '${prefix}-env'
var appName = '${prefix}-api'
var identityName = '${prefix}-identity'

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  properties: {
    retentionInDays: 30
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
    sku: { name: 'PerGB2018' }
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, 'AcrPull')
  scope: registry
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  }
}

module openAIGrant './openai-role.bicep' = {
  name: 'openai-access'
  scope: resourceGroup(split(existingOpenAIResourceId, '/')[2], split(existingOpenAIResourceId, '/')[4])
  params: {
    accountName: last(split(existingOpenAIResourceId, '/'))
    principalId: identity.properties.principalId
  }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: managedEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: identity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          env: [
            { name: 'AZURE_OPENAI_ENDPOINT', value: openAIEndpoint }
            { name: 'AZURE_OPENAI_DEPLOYMENT', value: modelDeploymentName }
            { name: 'AZURE_OPENAI_API_VERSION', value: '2025-04-01-preview' }
            { name: 'ACTIVE_GIT_SHA', value: activeGitSha }
            { name: 'ENABLE_CLARIO_TEST_MODE', value: string(enableClarioTestMode) }
            { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
            { name: 'PORT', value: '3000' }
          ]
          resources: { cpu: json('0.5'), memory: '1Gi' }
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/health', port: 3000, scheme: 'HTTP' }
              initialDelaySeconds: 10
              periodSeconds: 20
            }
            {
              type: 'Readiness'
              httpGet: { path: '/api/health', port: 3000, scheme: 'HTTP' }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
  dependsOn: [acrPull, openAIGrant]
}

output acrName string = registry.name
output acrLoginServer string = registry.properties.loginServer
output endpointUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output abstractionUrl string = 'https://${app.properties.configuration.ingress.fqdn}/api/v1/registry/abstract'
output manifestUrl string = 'https://${app.properties.configuration.ingress.fqdn}/api/harness/manifest'
output healthUrl string = 'https://${app.properties.configuration.ingress.fqdn}/api/health'
output casesUrl string = 'https://${app.properties.configuration.ingress.fqdn}/api/v1/registry/cases'
output deployedRevision string = activeGitSha
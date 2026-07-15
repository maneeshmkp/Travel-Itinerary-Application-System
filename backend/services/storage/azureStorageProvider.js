export async function uploadAzure({ buffer, key, contentType }) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  const container = process.env.AZURE_STORAGE_CONTAINER || "travel-documents"
  if (!connectionString) throw new Error("Azure Blob storage is not configured")

  let BlobServiceClient
  try {
    const sdk = await import("@azure/storage-blob")
    BlobServiceClient = sdk.BlobServiceClient
  } catch {
    throw new Error("Install @azure/storage-blob for Azure storage")
  }

  const client = BlobServiceClient.fromConnectionString(connectionString)
  const containerClient = client.getContainerClient(container)
  await containerClient.createIfNotExists()
  const blockBlob = containerClient.getBlockBlobClient(key)
  await blockBlob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } })

  return {
    storageKey: key,
    fileUrl: blockBlob.url,
    contentType,
  }
}

export async function getAzureSignedUrl(key, expiresInMinutes = 15) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  const container = process.env.AZURE_STORAGE_CONTAINER || "travel-documents"
  if (!connectionString) return null

  try {
    const { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } =
      await import("@azure/storage-blob")
    const client = BlobServiceClient.fromConnectionString(connectionString)
    const blob = client.getContainerClient(container).getBlockBlobClient(key)
    const startsOn = new Date()
    const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000)
    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: key,
        permissions: BlobSASPermissions.parse("r"),
        startsOn,
        expiresOn,
      },
      client.credential,
    ).toString()
    return `${blob.url}?${sas}`
  } catch {
    return null
  }
}

export async function deleteAzure(key) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  const container = process.env.AZURE_STORAGE_CONTAINER || "travel-documents"
  if (!connectionString) return

  try {
    const { BlobServiceClient } = await import("@azure/storage-blob")
    const client = BlobServiceClient.fromConnectionString(connectionString)
    await client.getContainerClient(container).getBlockBlobClient(key).deleteIfExists()
  } catch {
    /* ignore */
  }
}

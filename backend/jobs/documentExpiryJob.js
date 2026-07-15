export async function processDocumentExpiryJob() {
  try {
    const mod = await import("../services/documentReminder.js")
    if (typeof mod.runDocumentExpiryReminders === "function") {
      const result = await mod.runDocumentExpiryReminders()
      return { result }
    }
    if (typeof mod.checkDocumentExpiry === "function") {
      const result = await mod.checkDocumentExpiry()
      return { result }
    }
  } catch (err) {
    throw err
  }
  return { skipped: true }
}

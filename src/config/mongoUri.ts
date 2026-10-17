const passwordPlaceholder = /<[^>]*(?:password|pass)[^>]*>|\$\{?MONGODB_PASSWORD\}?/i;

export function getMongoUri(): string {
  const configuredUri = process.env.MONGODB_URI?.trim();
  if (!configuredUri) {
    throw new Error("MONGODB_URI is missing. Add your MongoDB Atlas connection string to the local .env file.");
  }

  if (!passwordPlaceholder.test(configuredUri)) return configuredUri;

  const password = process.env.MONGODB_PASSWORD;
  if (!password) {
    throw new Error("MONGODB_PASSWORD is required when MONGODB_URI contains a password placeholder.");
  }

  return configuredUri.replace(passwordPlaceholder, encodeURIComponent(password));
}

interface EnvConfig {
  API_URL: string;
  GOOGLE_CLIENT_ID: string;
  MICROSOFT_CLIENT_ID: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  'API_URL',
  'GOOGLE_CLIENT_ID',
  'MICROSOFT_CLIENT_ID',
];

export const validateEnv = (): void => {
  const missingVars = requiredEnvVars.filter(
    (key) => !import.meta.env[`VITE_${key}`]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars
        .map((key) => `VITE_${key}`)
        .join(', ')}`
    );
  }
};

export const getEnvVar = (key: keyof EnvConfig): string => {
  const value = import.meta.env[`VITE_${key}`];
  if (!value) {
    throw new Error(`Environment variable VITE_${key} is not set`);
  }
  return value;
};

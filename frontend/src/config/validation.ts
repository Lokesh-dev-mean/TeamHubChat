/**
 * Environment variable validation schema
 */
interface ValidationSchema {
  type: 'string' | 'number' | 'boolean' | 'url';
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
  message: string;
}

interface EnvSchema {
  [key: string]: ValidationSchema;
}

const ENV_SCHEMA: EnvSchema = {
  // Required variables
  VITE_API_URL: {
    type: 'url',
    required: true,
    message: 'Must be a valid API URL',
  },
  VITE_GOOGLE_CLIENT_ID: {
    type: 'string',
    required: true,
    message: 'Google Client ID is required',
  },
  VITE_MICROSOFT_CLIENT_ID: {
    type: 'string',
    required: true,
    message: 'Microsoft Client ID is required',
  },

  // Optional variables
  VITE_APP_NAME: {
    type: 'string',
    required: false,
    message: 'Application name must be a string',
  },
  VITE_APP_VERSION: {
    type: 'string',
    required: false,
    pattern: /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/,
    message: 'Must be a valid semantic version',
  },
  VITE_ENABLE_FILE_UPLOAD: {
    type: 'boolean',
    required: false,
    message: 'Must be a boolean value',
  },
  VITE_MAX_FILE_SIZE: {
    type: 'number',
    required: false,
    min: 0,
    message: 'Must be a positive number',
  },
  VITE_PRIMARY_COLOR: {
    type: 'string',
    required: false,
    pattern: /^#[0-9A-Fa-f]{6}$/,
    message: 'Must be a valid hex color code',
  },
  VITE_SECONDARY_COLOR: {
    type: 'string',
    required: false,
    pattern: /^#[0-9A-Fa-f]{6}$/,
    message: 'Must be a valid hex color code',
  },
};

/**
 * Validate environment variables
 * @param env - Environment variables object
 * @returns Validation result
 */
export function validateEnv(env: ImportMetaEnv): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  Object.entries(ENV_SCHEMA).forEach(([key, schema]) => {
    const value = env[key as keyof ImportMetaEnv];

    // Check required variables
    if (schema.required && !value) {
      errors.push(`${key} is required`);
      return;
    }

    // Skip validation if value is not provided and not required
    if (!value && !schema.required) {
      return;
    }

    // Validate value
    if (!validateValue(value, schema)) {
      errors.push(`${key}: ${schema.message}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single value against its schema
 * @param value - Value to validate
 * @param schema - Validation schema
 * @returns Whether the value is valid
 */
type Validator = (value: any, schema: ValidationSchema) => boolean;

const validators: Record<ValidationSchema['type'], Validator> = {
  string: (value, schema) => {
    if (typeof value !== 'string') {
      return false;
    }
    if (schema.pattern && !schema.pattern.test(value)) {
      return false;
    }
    if (schema.minLength && value.length < schema.minLength) {
      return false;
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      return false;
    }
    if (schema.enum && !schema.enum.includes(value)) {
      return false;
    }
    return true;
  },

  number: (value, schema) => {
    const num = Number(value);
    if (isNaN(num)) {
      return false;
    }
    if (schema.min !== undefined && num < schema.min) {
      return false;
    }
    if (schema.max !== undefined && num > schema.max) {
      return false;
    }
    return true;
  },

  boolean: (value) => {
    return value === 'true' || value === 'false' || typeof value === 'boolean';
  },

  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
};

function validateValue(value: any, schema: ValidationSchema): boolean {
  const validator = validators[schema.type];
  return validator ? validator(value, schema) : true;
}

/**
 * Initialize environment validation
 * Throws an error if validation fails
 */
export function initEnvValidation(): void {
  const { isValid, errors } = validateEnv(import.meta.env);

  if (!isValid) {
    console.error('Environment validation failed:');
    errors.forEach(error => console.error(`- ${error}`));
    throw new Error('Invalid environment configuration');
  }
}

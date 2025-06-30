export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string, allData?: Record<string, string>) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateField = (value: string, rules: ValidationRule, allData?: Record<string, string>): string | null => {
  // Required validation
  if (rules.required && (!value || value.trim().length === 0)) {
    return 'This field is required';
  }

  // Skip other validations if field is empty and not required
  if (!value || value.trim().length === 0) {
    return null;
  }

  // Min length validation
  if (rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }

  // Max length validation
  if (rules.maxLength && value.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters`;
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    return 'Invalid format';
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value, allData);
  }

  return null;
};

export const validateForm = (data: Record<string, string>, rules: ValidationRules): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach(field => {
    const value = data[field] || '';
    const fieldRules = rules[field];
    const error = validateField(value, fieldRules, data);
    
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  name: /^[a-zA-Z\s]{2,50}$/,
  bloodGroup: /^(A|B|AB|O)[+-]$/,
};

// Common validation rules
export const CommonValidationRules = {
  email: {
    required: true,
    pattern: ValidationPatterns.email,
    custom: (value: string) => {
      if (value.length > 254) {
        return 'Email address is too long';
      }
      return null;
    },
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      if (!ValidationPatterns.password.test(value)) {
        return 'Password must contain at least 8 characters with uppercase, lowercase, and number';
      }
      return null;
    },
  },
  confirmPassword: (originalPassword: string) => ({
    required: true,
    custom: (value: string) => {
      if (value !== originalPassword) {
        return 'Passwords do not match';
      }
      return null;
    },
  }),
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: ValidationPatterns.name,
  },
  phone: {
    required: true,
    pattern: ValidationPatterns.phone,
    custom: (value: string) => {
      const cleanPhone = value.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return 'Phone number must be between 10-15 digits';
      }
      return null;
    },
  },
  bloodGroup: {
    required: true,
    pattern: ValidationPatterns.bloodGroup,
  },
};

// Real-time validation hook
import { useState, useCallback } from 'react';

export const useFormValidation = (initialData: Record<string, string>, initialRules: ValidationRules) => {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [rules, setRules] = useState(initialRules);

  const validateSingleField = useCallback((field: string, value: string, currentRules?: ValidationRules) => {
    const rulesToUse = currentRules || rules;
    if (rulesToUse[field]) {
      const error = validateField(value, rulesToUse[field], data);
      setErrors(prev => ({
        ...prev,
        [field]: error || '',
      }));
      return !error;
    }
    return true;
  }, [rules, data]);

  const updateField = useCallback((field: string, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    
    // Validate if field has been touched
    if (touched[field]) {
      setTimeout(() => {
        validateSingleField(field, value);
      }, 0);
    }
  }, [touched, validateSingleField, data]);

  const touchField = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateSingleField(field, data[field] || '');
  }, [data, validateSingleField]);

  const validateAll = useCallback(() => {
    const allErrors = validateForm(data, rules);
    setErrors(allErrors);
    setTouched(Object.keys(rules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return Object.keys(allErrors).length === 0;
  }, [data, rules]);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  const setValidationRules = useCallback((newRules: ValidationRules) => {
    setRules(newRules);
  }, []);

  return {
    data,
    errors,
    touched,
    updateField,
    touchField,
    validateAll,
    reset,
    setValidationRules,
    isValid: Object.keys(errors).length === 0 && Object.keys(touched).length > 0,
  };
};
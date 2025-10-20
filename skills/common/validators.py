"""
Shared Input Validation Library for Skills

Provides comprehensive input validation to prevent security vulnerabilities:
- Invalid operations
- Path traversal
- Invalid data types
- Missing required fields

All Skills should import and use these validators for context validation.

Example:
    from common.validators import ContextValidator

    # Validate operation
    valid, error = ContextValidator.validate_operation(
        operation='scan',
        allowed=['scan', 'analyze']
    )
    if not valid:
        return {"success": False, "error": error}
"""

import os
import re
from typing import Dict, List, Tuple, Optional, Any


class ContextValidator:
    """Shared validation for Skill context inputs"""

    @staticmethod
    def validate_operation(operation: str, allowed: List[str]) -> Tuple[bool, Optional[str]]:
        """
        Validate operation is in allowed list

        Args:
            operation: Operation name to validate
            allowed: List of allowed operations

        Returns:
            Tuple of (is_valid, error_message)
                - (True, None) if valid
                - (False, error_message) if invalid

        Example:
            >>> valid, error = ContextValidator.validate_operation('scan', ['scan', 'analyze'])
            >>> assert valid == True

            >>> valid, error = ContextValidator.validate_operation('delete', ['scan', 'analyze'])
            >>> assert valid == False
            >>> assert 'Invalid operation' in error
        """
        if not operation or not isinstance(operation, str):
            return False, "Operation must be a non-empty string"

        if not allowed or not isinstance(allowed, list):
            return False, "Allowed operations list is required"

        if operation not in allowed:
            return False, f"Invalid operation: '{operation}'. Allowed: {', '.join(allowed)}"

        return True, None

    @staticmethod
    def validate_path(path: str, must_exist: bool = False, allow_relative: bool = False) -> Tuple[bool, Optional[str]]:
        """
        Validate file path is safe

        Args:
            path: File path to validate
            must_exist: Whether path must exist on filesystem
            allow_relative: Whether to allow relative paths (default: False)

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> valid, error = ContextValidator.validate_path('/valid/path')
            >>> assert valid == True

            >>> valid, error = ContextValidator.validate_path('../../../etc/passwd')
            >>> assert valid == False
            >>> assert 'Path traversal' in error
        """
        if not path or not isinstance(path, str):
            return False, "Path must be a non-empty string"

        # Security: Prevent path traversal
        if '..' in path:
            return False, "Path traversal detected: '..' not allowed"

        # Security: Require absolute paths (unless explicitly allowed)
        if not allow_relative and not os.path.isabs(path):
            return False, f"Path must be absolute: {path}"

        # Optionally check existence
        if must_exist and not os.path.exists(path):
            return False, f"Path does not exist: {path}"

        return True, None

    @staticmethod
    def validate_context(context: Dict, schema: Dict[str, Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
        """
        Validate context against schema

        Args:
            context: Context dictionary to validate
            schema: Schema defining required fields and types
                Example:
                {
                    'operation': {'required': True, 'type': str},
                    'path': {'required': True, 'type': str},
                    'options': {'required': False, 'type': dict}
                }

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> schema = {
            ...     'operation': {'required': True, 'type': str},
            ...     'path': {'required': True, 'type': str}
            ... }
            >>> valid, error = ContextValidator.validate_context(
            ...     {'operation': 'scan', 'path': '/test'},
            ...     schema
            ... )
            >>> assert valid == True
        """
        if not isinstance(context, dict):
            return False, "Context must be a dictionary"

        if not isinstance(schema, dict):
            return False, "Schema must be a dictionary"

        # Check required fields
        for field_name, field_schema in schema.items():
            is_required = field_schema.get('required', False)
            expected_type = field_schema.get('type')

            # Check if required field is present
            if is_required and field_name not in context:
                return False, f"Missing required field: '{field_name}'"

            # Check type if field is present
            if field_name in context and expected_type:
                value = context[field_name]
                if not isinstance(value, expected_type):
                    return False, f"Invalid type for '{field_name}': expected {expected_type.__name__}, got {type(value).__name__}"

        return True, None

    @staticmethod
    def validate_enum(value: str, allowed_values: List[str], field_name: str = 'value') -> Tuple[bool, Optional[str]]:
        """
        Validate value is in allowed enum list

        Args:
            value: Value to validate
            allowed_values: List of allowed values
            field_name: Name of field for error messages

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> valid, error = ContextValidator.validate_enum('aws', ['aws', 'azure', 'gcp'], 'provider')
            >>> assert valid == True

            >>> valid, error = ContextValidator.validate_enum('invalid', ['aws', 'azure'], 'provider')
            >>> assert valid == False
        """
        if not isinstance(value, str):
            return False, f"{field_name} must be a string"

        if not isinstance(allowed_values, list):
            return False, "Allowed values must be a list"

        if value not in allowed_values:
            return False, f"Invalid {field_name}: '{value}'. Allowed: {', '.join(allowed_values)}"

        return True, None

    @staticmethod
    def validate_list(value: List, allowed_item_type: type = None, field_name: str = 'list') -> Tuple[bool, Optional[str]]:
        """
        Validate value is a list with optional type checking

        Args:
            value: Value to validate
            allowed_item_type: Optional type that all items must match
            field_name: Name of field for error messages

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> valid, error = ContextValidator.validate_list(['a', 'b'], str, 'tags')
            >>> assert valid == True

            >>> valid, error = ContextValidator.validate_list(['a', 1], str, 'tags')
            >>> assert valid == False
        """
        if not isinstance(value, list):
            return False, f"{field_name} must be a list"

        # Optionally check item types
        if allowed_item_type:
            for i, item in enumerate(value):
                if not isinstance(item, allowed_item_type):
                    return False, f"{field_name}[{i}] must be {allowed_item_type.__name__}, got {type(item).__name__}"

        return True, None

    @staticmethod
    def validate_integer_range(value: int, min_val: int, max_val: int, field_name: str = 'value') -> Tuple[bool, Optional[str]]:
        """
        Validate integer is within range

        Args:
            value: Integer to validate
            min_val: Minimum value (inclusive)
            max_val: Maximum value (inclusive)
            field_name: Name of field for error messages

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> valid, error = ContextValidator.validate_integer_range(5, 1, 10, 'timeout')
            >>> assert valid == True

            >>> valid, error = ContextValidator.validate_integer_range(15, 1, 10, 'timeout')
            >>> assert valid == False
        """
        if not isinstance(value, int):
            return False, f"{field_name} must be an integer, got {type(value).__name__}"

        if value < min_val or value > max_val:
            return False, f"{field_name} must be between {min_val} and {max_val}, got {value}"

        return True, None

    @staticmethod
    def validate_pattern(value: str, pattern: str, field_name: str = 'value') -> Tuple[bool, Optional[str]]:
        """
        Validate string matches regex pattern

        Args:
            value: String to validate
            pattern: Regular expression pattern
            field_name: Name of field for error messages

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> valid, error = ContextValidator.validate_pattern('abc123', r'^[a-z0-9]+$', 'name')
            >>> assert valid == True

            >>> valid, error = ContextValidator.validate_pattern('abc@123', r'^[a-z0-9]+$', 'name')
            >>> assert valid == False
        """
        if not isinstance(value, str):
            return False, f"{field_name} must be a string"

        try:
            if not re.match(pattern, value):
                return False, f"{field_name} format invalid: '{value}' doesn't match pattern {pattern}"
        except re.error as e:
            return False, f"Invalid regex pattern: {e}"

        return True, None

    @staticmethod
    def sanitize_filename(filename: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Sanitize and validate filename

        Args:
            filename: Filename to sanitize

        Returns:
            Tuple of (is_valid, error_message, sanitized_filename)
                - (True, None, sanitized) if valid
                - (False, error, None) if invalid

        Example:
            >>> valid, error, sanitized = ContextValidator.sanitize_filename('report.pdf')
            >>> assert valid == True
            >>> assert sanitized == 'report.pdf'

            >>> valid, error, sanitized = ContextValidator.sanitize_filename('../../../etc/passwd')
            >>> assert valid == False
        """
        if not filename or not isinstance(filename, str):
            return False, "Filename must be a non-empty string", None

        # Security: Check for path traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            return False, "Filename cannot contain path separators or '..'", None

        # Security: Check for dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\x00']
        for char in dangerous_chars:
            if char in filename:
                return False, f"Filename contains forbidden character: {char}", None

        # Sanitize: Remove leading/trailing whitespace and dots
        sanitized = filename.strip().lstrip('.')

        if not sanitized:
            return False, "Filename is empty after sanitization", None

        return True, None, sanitized

    @staticmethod
    def validate_required_fields(context: Dict, required_fields: List[str]) -> Tuple[bool, Optional[str]]:
        """
        Check that all required fields are present

        Args:
            context: Context dictionary
            required_fields: List of required field names

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> valid, error = ContextValidator.validate_required_fields(
            ...     {'name': 'test', 'age': 30},
            ...     ['name', 'age']
            ... )
            >>> assert valid == True

            >>> valid, error = ContextValidator.validate_required_fields(
            ...     {'name': 'test'},
            ...     ['name', 'age']
            ... )
            >>> assert valid == False
        """
        if not isinstance(context, dict):
            return False, "Context must be a dictionary"

        if not isinstance(required_fields, list):
            return False, "Required fields must be a list"

        missing = [field for field in required_fields if field not in context]

        if missing:
            return False, f"Missing required field(s): {', '.join(missing)}"

        return True, None


class SkillContextValidator:
    """
    Convenience wrapper for common Skill context validation patterns
    """

    @staticmethod
    def validate_standard_context(context: Dict, allowed_operations: List[str]) -> Tuple[bool, Optional[str]]:
        """
        Validate standard Skill context structure

        Expected fields:
        - operation (required): Must be in allowed_operations
        - Additional fields validated based on operation

        Args:
            context: Context dictionary
            allowed_operations: List of allowed operations

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> valid, error = SkillContextValidator.validate_standard_context(
            ...     {'operation': 'scan', 'project_dir': '/test'},
            ...     ['scan', 'analyze']
            ... )
            >>> assert valid == True
        """
        # Check context is a dictionary
        if not isinstance(context, dict):
            return False, "Context must be a dictionary"

        # Validate operation field
        if 'operation' not in context:
            return False, "Missing required field: 'operation'"

        valid, error = ContextValidator.validate_operation(
            context['operation'],
            allowed_operations
        )

        if not valid:
            return False, error

        return True, None


# Convenience function for Skills to get JSON error response
def validation_error_response(error_message: str) -> Dict:
    """
    Create standardized error response for validation failures

    Args:
        error_message: Error message describing validation failure

    Returns:
        Dictionary with standard error format

    Example:
        >>> response = validation_error_response("Invalid operation")
        >>> assert response['success'] == False
        >>> assert 'Invalid operation' in response['error']
    """
    return {
        "success": False,
        "error": f"Validation error: {error_message}",
        "error_type": "VALIDATION_ERROR"
    }

package com.moneymanager.common;

import com.moneymanager.auth.AuthException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AuthException.class)
    ResponseEntity<ErrorResponse> handleAuth(AuthException exception, HttpServletRequest request) {
        HttpStatus status = switch (exception.code()) {
            case "INVALID_CREDENTIALS", "INVALID_REFRESH_TOKEN", "INVALID_EMAIL_TOKEN", "INVALID_RESET_TOKEN" -> HttpStatus.UNAUTHORIZED;
            case "RATE_LIMITED" -> HttpStatus.TOO_MANY_REQUESTS;
            case "EMAIL_ALREADY_REGISTERED" -> HttpStatus.CONFLICT;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(new ErrorResponse(
                exception.code(),
                exception.getMessage(),
                request.getHeader("X-Correlation-ID"),
                Map.of(),
                Instant.now()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        Map<String, String> fieldErrors = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (left, right) -> left));

        return ResponseEntity.badRequest().body(new ErrorResponse(
                "VALIDATION_FAILED",
                "Request validation failed",
                request.getHeader("X-Correlation-ID"),
                fieldErrors,
                Instant.now()
        ));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse(
                "INTERNAL_ERROR",
                "Unexpected server error",
                request.getHeader("X-Correlation-ID"),
                Map.of(),
                Instant.now()
        ));
    }
}

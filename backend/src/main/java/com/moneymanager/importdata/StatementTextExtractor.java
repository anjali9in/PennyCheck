package com.moneymanager.importdata;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StatementTextExtractor {

    public StatementTextExtractionResponse extract(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Statement file is required");
        }

        String fileName = file.getOriginalFilename() == null ? "statement" : file.getOriginalFilename();
        String contentType = file.getContentType() == null ? contentTypeFromName(fileName) : file.getContentType();
        try {
            byte[] bytes = file.getBytes();
            String text = isPdf(fileName, contentType) ? extractPdf(bytes) : new String(bytes, StandardCharsets.UTF_8);
            return new StatementTextExtractionResponse(fileName, contentType, text);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Unable to read statement file", exception);
        }
    }

    private String extractPdf(byte[] bytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            return new PDFTextStripper().getText(document);
        }
    }

    private boolean isPdf(String fileName, String contentType) {
        return "application/pdf".equalsIgnoreCase(contentType) || fileName.toLowerCase(Locale.ROOT).endsWith(".pdf");
    }

    private String contentTypeFromName(String fileName) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lower.endsWith(".csv")) {
            return "text/csv";
        }
        return "text/plain";
    }
}
